# Test Fyp Chat Endpoint Directly (PowerShell)
# This tests the consultant without SmartMENA integration

$CLIENT_ID = "c218eadd-6861-45b3-8fc3-8af5691d080c"
$FYP_URL = "http://localhost:3001"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Testing Fyp Chat Endpoint" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Simple greeting (should be fast)
Write-Host "Test 1: Simple greeting message" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
$body1 = @{
    message = "Hello"
    clientId = $CLIENT_ID
    enableWriteTools = $false
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "$FYP_URL/chat" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body1 `
    -TimeoutSec 30

Write-Host "Response:" -ForegroundColor Green
$response1 | ConvertTo-Json -Depth 5
Write-Host ""
Write-Host ""

# Test 2: Ask about campaigns (requires MCP tool)
Write-Host "Test 2: Ask about campaigns (MCP tool call)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
$body2 = @{
    message = "List my campaigns"
    clientId = $CLIENT_ID
    enableWriteTools = $false
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$FYP_URL/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body2 `
        -TimeoutSec 60

    Write-Host "Response:" -ForegroundColor Green
    $response2 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host ""

# Test 3: Campaign creation request (write tools enabled)
Write-Host "Test 3: Campaign creation flow" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
$body3 = @{
    message = "I want to create a new campaign. Goal: Sales, Budget: `$50/day, Audience: Ages 25-54 in Lebanon, Duration: Ongoing"
    clientId = $CLIENT_ID
    enableWriteTools = $true
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$FYP_URL/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body3 `
        -TimeoutSec 180

    Write-Host "Response:" -ForegroundColor Green
    $response3 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
