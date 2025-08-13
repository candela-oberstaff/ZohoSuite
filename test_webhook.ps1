# Test webhook script
$uri = "https://n8n.obertrack.com/webhook/695cf0ce-bbbe-42f2-b8c9-472d7cc82b03"
$body = @{
    message = "test"
    userId = "test-user"
    sessionId = "test-session"
    messageId = "test-123"
    timestamp = "2024-12-24T20:31:30.123Z"
} | ConvertTo-Json

Write-Host "Testing webhook: $uri"
Write-Host "Request body: $body"
Write-Host "---"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Content Type: $($response.Headers['Content-Type'])"
    Write-Host "Response Body:"
    Write-Host $response.Content
} catch {
    Write-Host "Error occurred:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}