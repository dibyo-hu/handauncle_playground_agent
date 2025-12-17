# Agentic Finance Playground

A local, experiment-driven agentic system for Indian personal finance recommendations. This is NOT a chatbot - it's a controlled decision engine with strict schemas, grounded web search, and tweakable user context.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                             │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   LAYER 0   │   │   LAYER 1   │   │   LAYER 2   │           │
│  │  Classifier │──▶│   Context   │──▶│  Web Search │           │
│  │  (GPT-4.1)  │   │  Injection  │   │    OpenAI   │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│         │                                    │                 │
│         │ REJECT if not                     │                  │
│         │ Indian finance                    ▼                  │
│         │                          ┌─────────────────┐         │
│         │                          │    LAYER 3+4    │         │
│         ▼                          │  Recommender +  │         │
│   ┌──────────┐                     │   Validator     │         │
│   │ REJECTION│                     │  (Repair Loop)  │         │
│   │ RESPONSE │                     └─────────────────┘         │
│   └──────────┘                              │                  │
│                                             ▼                  │
│                                    ┌─────────────────┐         │
│                                    │ RECOMMENDATIONS │         │
│                                    │    (JSON)       │         │
│                                    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Layers Explained

### Layer 0 - Query Classifier (`classifier.ts`)
- **Purpose**: Fast, cheap gate-keeper to filter non-Indian finance queries
- **Model**: GPT-4o-mini for speed and cost efficiency
- **Behavior**: If query is NOT Indian finance related, immediately returns rejection without running subsequent layers
- **Heuristics**: Uses keyword matching for fast classification before LLM fallback

### Layer 1 - User Context (`context.ts`)
- **Purpose**: Single source of truth for user financial data
- **Design**: Structured JSON schema with real Indian mutual fund data
- **Features**: Computes derived metrics (surplus, emergency fund gap, asset allocation)
- **Important**: Context is injected as structured data, NOT merged textually into prompts

### Layer 2 - Web Search (`webSearch.ts`)
- **Purpose**: Ground recommendations with real-time fund data
- **Trigger**: Conditional - only runs when recommending new instruments
- **API**: Uses Tavily for web search
- **Output**: Extracts structured fund facts (returns, expense ratio, AUM)
- **Caching**: 30-minute cache to avoid redundant searches

### Layer 3 - Recommendation Engine (`recommender.ts`)
- **Purpose**: Generate schema-validated investment recommendations
- **Model**: GPT-4o for high-quality recommendations
- **Constraints**:
  - Only mutual funds, index funds, debt funds, liquid funds, ELSS
  - NO stocks, crypto, derivatives
  - Total amount ≤ monthly surplus

### Layer 4 - Validator (`validator.ts`)
- **Purpose**: Ensure LLM output conforms to schema and business rules
- **Repair Loop**: Retries up to 2 times if validation fails
- **Validations**:
  - JSON schema validation (Zod)
  - Numeric constraints (amounts ≤ surplus)
  - Forbidden instrument check
  - Execution always disabled

## Project Structure

```
agentic-playground/
├── backend/
│   ├── src/
│   │   ├── layers/
│   │   │   ├── classifier.ts     # Layer 0: Query classification
│   │   │   ├── context.ts        # Layer 1: User context management
│   │   │   ├── webSearch.ts      # Layer 2: Grounded web search
│   │   │   ├── recommender.ts    # Layer 3: LLM recommendations
│   │   │   ├── validator.ts      # Layer 4: Validation + repair
│   │   │   └── orchestrator.ts   # Pipeline coordinator
│   │   ├── types/
│   │   │   └── schemas.ts        # Zod schemas for all data
│   │   ├── routes/
│   │   │   └── api.ts            # REST API endpoints
│   │   ├── utils/
│   │   │   └── logger.ts         # Structured logging
│   │   └── server.ts             # Express server entry
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContextEditor.tsx   # JSON editor for user context
│   │   │   ├── QueryInput.tsx      # Query input with examples
│   │   │   └── ResultDisplay.tsx   # Recommendations table + metadata
│   │   ├── lib/
│   │   │   └── api.ts              # API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript types
│   │   ├── App.tsx                 # Main application
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Tailwind styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

## Setup & Run Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key
- Tavily API key (optional, for web search grounding)

### 1. Clone and navigate
```bash
cd agentic-playground
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your API keys:
# OPENAI_API_KEY=sk-your-key-here
# TAVILY_API_KEY=tvly-your-key-here  (optional)

# Start development server
npm run dev
```

Backend runs at: http://localhost:3001

### 3. Frontend Setup (new terminal)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: http://localhost:3000

### 4. Using the Playground

1. **View Default Context**: The left panel shows default user financial data with real Indian mutual funds
2. **Edit Context**: Modify the JSON to change income, expenses, holdings, risk profile, etc.
3. **Submit Query**: Ask questions about Indian mutual funds, SIPs, portfolio allocation
4. **View Results**: See classification, situation analysis, and recommendations table
5. **Experiment**: Modify context and replay the same query to observe behavioral changes

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/default-context` | Get default user context |
| POST | `/api/recommend` | Submit query for recommendations |
| GET | `/api/logs` | View debug logs |
| DELETE | `/api/logs` | Clear log buffer |

### POST /api/recommend

**Request:**
```json
{
  "query": "Which mutual fund should I start a SIP in?",
  "user_context": {
    "monthly_income": 150000,
    "monthly_expenses": 80000,
    "bank_balance": 500000,
    "mutual_fund_holdings": [...],
    "risk_profile": "moderate",
    "investment_horizon_years": 10,
    "dependents": 2,
    "emergency_fund_months": 6
  }
}
```

**Success Response:**
```json
{
  "type": "success",
  "classification": {
    "is_indian_finance": true,
    "confidence": 0.95,
    "reason": "Query about mutual fund SIP"
  },
  "web_search": {
    "query": "best mutual fund India 2024...",
    "funds": [...],
    "search_timestamp": "2024-...",
    "source_urls": [...]
  },
  "recommendation": {
    "context": {
      "user_intent_summary": "User wants to start a SIP...",
      "query_type": "new_investment"
    },
    "situation": {
      "description": "Based on your moderate risk profile...",
      "data_basis": "user_data",
      "scenario_type": "data-backed"
    },
    "recommendations": [
      {
        "instrument": {
          "name": "Parag Parikh Flexi Cap Fund",
          "category": "mutual_fund"
        },
        "action": "BUY",
        "rationale": "Diversified flexi cap with strong track record...",
        "amount": 20000,
        "execution": {
          "enabled": false,
          "label": "Execute (Coming Soon)"
        }
      }
    ]
  },
  "validation_attempts": 1
}
```

**Rejection Response:**
```json
{
  "type": "rejection",
  "classification": {
    "is_indian_finance": false,
    "confidence": 0.9,
    "reason": "Query about cryptocurrency is outside scope"
  },
  "message": "I can only help with Indian personal finance topics..."
}
```

## Hard Constraints

These constraints are **enforced in code**:

- **NO individual stocks** - Mutual funds only
- **NO cryptocurrency**
- **NO derivatives** (options, futures, F&O)
- **Allowed instruments**: Mutual funds, Index funds, Debt funds, Liquid funds, ELSS
- **Amount constraint**: Sum of all recommendation amounts ≤ monthly surplus
- **Execution disabled**: All execute buttons are disabled

## Experiment Support

This system is designed for **behavior experimentation**:

1. **Same Query, Different Context**: Submit a query, modify user context, replay to observe how recommendations change
2. **Risk Profile Testing**: Change risk_profile from "low" to "high" and see allocation shifts
3. **Income/Expense Variations**: Modify monthly_surplus to see amount constraints in action
4. **Holdings Impact**: Add/remove funds from portfolio to see rebalancing suggestions

## Debugging

### View Logs
```bash
curl http://localhost:3001/api/logs
```

### Log Levels
- Each layer logs its inputs/outputs
- Errors include layer identification
- Validation failures show specific constraint violations

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o and GPT-4o-mini |
| `TAVILY_API_KEY` | No | Tavily API key for web search (recommendations will work without, but won't be grounded) |
| `PORT` | No | Backend port (default: 3001) |

## Tech Stack

### Backend
- Node.js / TypeScript
- Express.js
- OpenAI SDK
- Zod (schema validation)

### Frontend
- React 18 / TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Notes

- This is a **behavior experimentation tool**, not a production system
- Execute buttons are intentionally disabled
- Web search is optional but recommended for grounded recommendations
- All fund names in default context are real Indian mutual funds
