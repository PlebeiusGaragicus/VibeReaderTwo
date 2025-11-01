# VibeReader - eCash Payment System

TODO: this whole concept needs to be rethought

## Overview

VibeReader uses a **hosted balance system** with eCash (Cashu) for Bitcoin payments. Users pay for AI inference and storage costs with sats.

---

## Architecture

### Hosted Balance Model

- **User Balance**: Stored in backend database (PostgreSQL/SQLite)
- **Deposits**: User pays Lightning invoice → eCash tokens → credited to balance
- **Payments**: AI requests deduct from balance automatically
- **Admin Revenue**: Accumulated in admin balance → auto-withdraw to Lightning address

### Why Hosted Balance?

✅ **LangGraph Integration**: Agent can check/deduct balance via API  
✅ **Simpler UX**: No client-side token management  
✅ **Atomic Operations**: Balance updates in database transactions  
✅ **Audit Trail**: Complete transaction history  
✅ **Auto-Withdrawals**: Admin balance auto-converts to Lightning  

---

## Components

### 1. User Balance Service
- Track balance per user (Nostr pubkey)
- Generate deposit invoices via eCash mint
- Deduct balance on AI usage
- Transaction history

### 2. Admin Balance Service
- Accumulate revenue from user payments
- Auto-withdraw when threshold reached (e.g., 100,000 sats)
- Cron job runs every 30 minutes
- Withdraw to configured Lightning address

### 3. Payment Middleware
- Verify sufficient balance before processing requests
- Deduct balance after successful completion
- Return 402 Payment Required if insufficient

### 4. LangGraph Integration
- Agent checks balance before processing
- Calculates cost based on tokens used
- Deducts from user balance atomically

---

## Data Flow

### Deposit Flow

```
1. User clicks "Deposit"
   └─> Frontend: POST /payments/deposit { amount: 10000 }

2. Backend generates Lightning invoice via eCash mint
   └─> Cashu mint: request_mint(10000)
   └─> Returns: { invoice: "lnbc...", quote_id: "abc123" }

3. User pays invoice (wallet app, QR code, etc.)

4. Backend polls mint for payment status
   └─> Every 5 seconds: check_mint_quote(quote_id)
   └─> When paid: mint issues eCash tokens

5. Backend redeems tokens immediately
   └─> Cashu mint: redeem(tokens)
   └─> Backend receives sats

6. Credit user balance in database
   └─> user_balances.balance += 10000
   └─> admin_balance.balance += 10000
   └─> Create transaction record

7. Notify user
   └─> WebSocket: "Deposit confirmed! Balance: 10,000 sats"
```

### AI Payment Flow

```
1. User sends AI chat message
   └─> POST /chat { message: "Explain this passage" }

2. Payment middleware checks balance
   └─> SELECT balance FROM user_balances WHERE pubkey = ?
   └─> If balance < estimated_cost: return 402

3. LangGraph agent processes request
   └─> Streams response to user
   └─> Tracks tokens used

4. After completion, deduct balance
   └─> actual_cost = tokens_used * PRICE_PER_TOKEN
   └─> UPDATE user_balances SET balance = balance - actual_cost
   └─> INSERT INTO transactions (type='ai_chat', amount=actual_cost)

5. Return response to user
```

### Auto-Withdrawal Flow

```
Every 30 minutes (cron job):

1. Check admin balance
   └─> SELECT balance FROM admin_balance

2. If balance >= WITHDRAWAL_THRESHOLD (e.g., 100,000 sats)
   └─> Calculate withdrawal amount (leave buffer)
   └─> withdrawal_amount = balance - 10,000  # Keep 10k buffer

3. Generate Lightning invoice from admin's wallet
   └─> Admin provides invoice via API or config

4. Pay invoice via eCash mint
   └─> Cashu mint: pay_invoice(invoice)
   └─> Mint sends Lightning payment

5. Update admin balance
   └─> UPDATE admin_balance SET balance = balance - withdrawal_amount
   └─> INSERT INTO admin_transactions (type='withdrawal', amount)

6. Log withdrawal
   └─> "Withdrew 90,000 sats to admin Lightning address"
```

---

## Database Schema

```sql
-- User balances
CREATE TABLE user_balances (
    pubkey TEXT PRIMARY KEY,
    balance_sats INTEGER DEFAULT 0 CHECK (balance_sats >= 0),
    total_deposited INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin balance (single row)
CREATE TABLE admin_balance (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    balance_sats INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    total_withdrawn INTEGER DEFAULT 0,
    last_withdrawal_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize admin balance
INSERT INTO admin_balance (id, balance_sats) VALUES (1, 0);

-- Transaction history
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pubkey TEXT NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'ai_chat', 'storage', 'refund'
    amount_sats INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (pubkey) REFERENCES user_balances(pubkey)
);

-- Admin transactions
CREATE TABLE admin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'revenue', 'withdrawal', 'refund'
    amount_sats INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    lightning_invoice TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Deposit quotes (pending deposits)
CREATE TABLE deposit_quotes (
    quote_id TEXT PRIMARY KEY,
    pubkey TEXT NOT NULL,
    amount_sats INTEGER NOT NULL,
    invoice TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- AI usage tracking
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pubkey TEXT NOT NULL,
    request_id TEXT NOT NULL,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_sats INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_pubkey ON transactions(pubkey);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_ai_usage_pubkey ON ai_usage(pubkey);
CREATE INDEX idx_deposit_quotes_status ON deposit_quotes(status);
```

---

## Configuration

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # eCash Mint
    CASHU_MINT_URL: str = "https://mint.minibits.cash"
    
    # Pricing (in sats)
    PRICE_PER_1K_TOKENS: int = 10  # 10 sats per 1k tokens
    PRICE_PER_MB_STORAGE: int = 100  # 100 sats per MB
    
    # Admin withdrawals
    ADMIN_WITHDRAWAL_THRESHOLD: int = 100_000  # 100k sats
    ADMIN_WITHDRAWAL_BUFFER: int = 10_000  # Keep 10k buffer
    ADMIN_LIGHTNING_ADDRESS: str = ""  # Set via env var
    WITHDRAWAL_CRON_INTERVAL: int = 30  # minutes
    
    # Deposit settings
    DEPOSIT_MIN_AMOUNT: int = 1_000  # 1k sats minimum
    DEPOSIT_MAX_AMOUNT: int = 1_000_000  # 1M sats maximum
    DEPOSIT_QUOTE_EXPIRY: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## API Endpoints

### User Balance

```
GET    /payments/balance
POST   /payments/deposit
GET    /payments/transactions
GET    /payments/quote/{quote_id}
```

### Admin (Protected)

```
GET    /admin/balance
GET    /admin/transactions
POST   /admin/withdraw
GET    /admin/stats
```

---

## Pricing Model

### AI Chat
- **Base**: 10 sats per 1,000 tokens
- **Example**: 500-token response = 5 sats

### Storage (Optional)
- **Blossom Upload**: 100 sats per MB
- **Example**: 2.5 MB EPUB = 250 sats

### Future Features
- Premium models: Higher rate
- Bulk discounts: Deposit 100k+ sats → 10% bonus
- Referral credits: Invite friends → earn sats

---

## Security Considerations

### Balance Protection
- Database constraints: `balance_sats >= 0`
- Atomic transactions: Use database transactions
- Race condition prevention: Row-level locking

### Admin Withdrawals
- Require authentication for manual withdrawals
- Rate limiting: Max 1 withdrawal per hour
- Notification on withdrawal (email/webhook)

### eCash Token Handling
- Tokens redeemed immediately (not stored)
- No client-side token management
- Mint communication over HTTPS only

---

## Monitoring & Alerts

### Metrics to Track
- Total user deposits (daily/weekly/monthly)
- Total AI spending
- Admin balance level
- Failed withdrawals
- Average cost per request

### Alerts
- Admin balance > threshold (ready to withdraw)
- Withdrawal failures
- Mint API errors
- Unusual spending patterns

---

## Development Phases

### Phase 1: Core Balance System
- [ ] Database schema
- [ ] User balance service
- [ ] Deposit flow (Lightning invoice via Cashu)
- [ ] Balance display in UI

### Phase 2: AI Payment Integration
- [ ] Payment middleware
- [ ] LangGraph balance check
- [ ] Cost calculation (token-based)
- [ ] Balance deduction

### Phase 3: Admin Withdrawals
- [ ] Admin balance tracking
- [ ] Auto-withdrawal cron job
- [ ] Manual withdrawal endpoint
- [ ] Withdrawal notifications

### Phase 4: Polish
- [ ] Transaction history UI
- [ ] Usage analytics
- [ ] Pricing adjustments
- [ ] Error handling & retries

---

## Libraries Needed

### Python (Backend)
```txt
# requirements.txt
cashu>=0.15.0          # eCash/Cashu library
httpx>=0.24.0          # HTTP client for mint API
apscheduler>=3.10.0    # Cron jobs for auto-withdrawal
```

### TypeScript (Frontend)
```json
{
  "dependencies": {
    "@cashu/cashu-ts": "^0.8.0"  // Optional: for client-side operations
  }
}
```

---

## Next Steps

1. Install Cashu library: `pip install cashu`
2. Implement balance service
3. Create deposit endpoints
4. Integrate with LangGraph agent
5. Set up auto-withdrawal cron job
