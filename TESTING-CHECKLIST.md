# AI Campaign Advisor - Testing Checklist

## Quick Status Check

Run these commands to verify everything is working:

### 1. Check Fyp Backend Health
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Check SmartMENA Backend Health
```bash
curl http://localhost:4000/api/health
# Expected: {"status":"ok",...}
```

### 3. Test Fyp Client
```bash
curl http://localhost:3001/clients/c218eadd-6861-45b3-8fc3-8af5691d080c
# Expected: Client details with metaAdAccountId, etc.
```

### 4. Test Campaign List (Direct Meta API)
```bash
curl "http://localhost:3001/api/clients/c218eadd-6861-45b3-8fc3-8af5691d080c/campaigns?limit=5"
# Expected: List of 5 campaigns in <2 seconds
```

---

## Performance Tests

### Test A: Simple Chat (Should be <10s)
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "clientId": "c218eadd-6861-45b3-8fc3-8af5691d080c",
    "enableWriteTools": false
  }' \
  -w "\nTime: %{time_total}s\n"
```

**Expected**: Response in 5-10 seconds
**If fails**: Check ANTHROPIC_API_KEY in Fyp backend

---

### Test B: Campaign Creation (Should be <60s after fix)
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Goal: Sales\nBudget: $50/day\nAudience: 25-54 in Lebanon\nDuration: Ongoing\n\n[CONTEXT: Account has 5 campaigns, average budget $5/day]",
    "clientId": "c218eadd-6861-45b3-8fc3-8af5691d080c",
    "enableWriteTools": true
  }' \
  --max-time 60 \
  -w "\nTime: %{time_total}s\n"
```

**Expected**: Response in 20-60 seconds with recommendations
**If fails (timeout)**: 
1. Check if consultant.ts was rebuilt: `cd Fyp/claude-sdk && npm run build`
2. Restart Fyp backend: `npm start`
3. Verify the system prompt includes "If [CONTEXT: ...] is in the message, USE THAT CONTEXT directly"

---

### Test C: Full Flow via SmartMENA Frontend

1. **Start all services**:
   ```bash
   # Terminal 1: Fyp backend
   cd Fyp/claude-sdk && npm start
   
   # Terminal 2: SmartMENA backend  
   cd backend && npm run dev
   
   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

2. **Open browser**: http://localhost:3000/campaigns

3. **Click "Create Campaign"**

4. **Send message**:
   ```
   Goal: Sales
   Budget: $50 per day
   Audience: Ages 25-54 in Lebanon and UAE, interested in hiking
   Duration: Start immediately, run for 30 days
   ```

5. **Expected behavior**:
   - Message sends successfully
   - Response within 60-120 seconds
   - Recommendations include:
     - Campaign name suggestion
     - Budget comparison to account average
     - Expected metrics (CPM, CTR, ROAS)
     - Timeline recommendations
   - Can confirm with "YES"

---

## Troubleshooting

### Issue: "Advisor backend unavailable"
**Check**: Is Fyp backend running?
```bash
curl http://localhost:3001/health
```
**Fix**: Start Fyp backend
```bash
cd Fyp/claude-sdk && npm start
```

---

### Issue: Timeout after 90 seconds
**Root cause**: SmartMENA backend timeout (increased to 180s)
**Check**: Did you restart SmartMENA backend after the fix?
```bash
# Stop backend (Ctrl+C)
cd backend && npm run dev
```

---

### Issue: Timeout after 180 seconds
**Root cause**: Claude calling list_campaigns even with [CONTEXT: ...]
**Check**: Was consultant.ts rebuilt?
```bash
cd Fyp/claude-sdk
npm run build
npm start
```

**Verify fix**: System prompt should say "If [CONTEXT: ...] is in the message, USE THAT CONTEXT directly. DO NOT call list_campaigns again."

---

### Issue: "ANTHROPIC_API_KEY not found"
**Fix**: Add to `Fyp/claude-sdk/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

### Issue: "Client not found"
**Fix**: Create client with valid Meta credentials:
```bash
curl -X POST http://localhost:3001/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Store",
    "metaAdAccountId": "act_XXXXXXXXX",
    "metaAccessToken": "EAAxxxx...",
    "metaAppId": "123456789",
    "metaAppSecret": "xxxxx"
  }'
```

---

### Issue: Meta API errors
**Check**: Is access token valid?
```bash
curl "http://localhost:3001/api/clients/YOUR_CLIENT_ID/campaigns?limit=1"
```

**Common errors**:
- `"code": 190` → Token expired (regenerate in Meta Business)
- `"code": 10` → Permission denied (ensure token has `ads_management` scope)
- `"code": 80001` → Rate limit (wait 5 minutes)

---

## Success Criteria

✅ Simple chat responds in <10s  
✅ Campaign creation with context responds in <60s  
✅ Frontend modal opens and loads greeting  
✅ User can send message and receive response  
✅ Recommendations are specific (not vague)  
✅ Recommendations reference account history  
✅ User can confirm and campaign is created  

---

## Performance Benchmarks

| Test | Target | Acceptable | Red Flag |
|------|--------|------------|----------|
| Simple chat | <10s | <20s | >30s |
| Campaign creation (no context) | <30s | <60s | >90s |
| Campaign creation (with context) | <20s | <60s | >90s |
| Frontend full flow | <60s | <120s | >180s |

---

## Logs to Check

### Fyp Backend Logs
Look for:
- `Processing chat request` (confirms request received)
- `request completed` (confirms response sent)
- Any errors with Anthropic API
- Any errors with MCP tools

### SmartMENA Backend Logs
Look for:
- `POST /api/advisor-chat/chat` (confirms frontend request)
- `[Advisor Chat Error]` (shows timeout or connection issues)
- Campaign context fetch (shows [CONTEXT: ...] being built)

### Frontend Console
Look for:
- `Calling advisor at: ...` (confirms request sent)
- `Advisor API error:` (shows frontend errors)
- Network tab: Check `/advisor-chat/chat` request timing

---

## Next Steps After Testing

Once everything works:

1. **Document user workflow** in README
2. **Add error messages** for common issues
3. **Consider adding**:
   - Progress indicator ("Analyzing your campaigns...")
   - Estimated wait time ("This may take up to 2 minutes")
   - Retry button if timeout occurs
4. **Optional enhancements**:
   - Ad set creation workflow
   - Ad creative upload
   - Campaign templates
   - Bulk campaign creation

---

**Last updated**: 2026-05-19
**Version**: Post-timeout-fix
