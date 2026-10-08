# test-encryption.ps1
#
# End-to-end demo of field-level encryption (AES-256-GCM) for Order PII.
# Shows that the ORDER API returns PLAINTEXT while PostgreSQL stores CIPHERTEXT
# prefixed with `enc:v1:` for receiverName / receiverPhone / receiverAddress / note.
#
# Prereqs: local docker stack running at https://localhost
#   docker compose -f docker-compose.yml -f docker-compose.lb.yml up -d --build --scale frontend=2
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\test-encryption.ps1

param(
  [string]$BaseUrl = 'https://localhost/api/v1',
  [string]$DbContainer = 'electronic-store-postgres',
  [string]$DbUser = 'ecommerce',
  [string]$DbName = 'ecommerce'
)

$ErrorActionPreference = 'Stop'

function Invoke-API {
  param([string]$Method, [string]$Path, [string]$Body, [string]$Cookie, [string]$Csrf)
  $args = @('-k', '-s', '-X', $Method, "$BaseUrl$Path", '-H', 'Content-Type: application/json')
  if ($Body) {
    # PS 5.1 mangles embedded quotes when passing JSON to native exes,
    # so hand the body to curl via a temp file instead.
    $tmp = Join-Path $env:TEMP ("pcstore-req-" + [guid]::NewGuid().ToString('N') + '.json')
    [System.IO.File]::WriteAllText($tmp, $Body, [System.Text.UTF8Encoding]::new($false))
    $args += @('--data', "@$tmp")
  }
  if ($Cookie) { $args += @('-b', $Cookie) }
  if ($Csrf)   { $args += @('-H', "x-csrf-token: $Csrf") }
  try {
    $raw = & curl.exe @args
    if ($LASTEXITCODE -ne 0) { throw "curl $Method $Path failed (exit $LASTEXITCODE)" }
    return $raw
  } finally {
    if ($Body) { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue }
  }
}

$suffix = Get-Date -Format 'yyyyMMddHHmmss'
$email    = "test-$suffix@example.com"
$password = 'Secret@12345'
$name     = 'Nguyen Van A'
$phone    = '0987654321'
$address  = '123 Le Loi, Quan 1, TP.HCM'
$note     = 'Giao gio hanh chinh 09:00-17:00'

Write-Host ''
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ' DEMO: Order field-level encryption (AES-256-GCM)' -ForegroundColor Cyan
Write-Host ' API returns plaintext  |  Database stores ciphertext enc:v1:...' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan

Write-Host ''
Write-Host '[1] Register a fresh test user, then login (capture access_token + csrf_token cookies)' -ForegroundColor Green
$register = Invoke-API 'POST' '/auth/register' ("{`"email`":`"$email`",`"password`":`"$password`",`"name`":`"Demo`"}")
if (-not ($register | ConvertFrom-Json).user.id) { throw 'Register failed' }

$loginBody = "{`"email`":`"$email`",`"password`":`"$password`"}"
$tmpLogin = Join-Path $env:TEMP ('pcstore-login-' + [guid]::NewGuid().ToString('N') + '.json')
[System.IO.File]::WriteAllText($tmpLogin, $loginBody, [System.Text.UTF8Encoding]::new($false))
$headers = & curl.exe -k -s -X POST "$BaseUrl/auth/login" -H 'Content-Type: application/json' `
  --data "@$tmpLogin" -D - -o NUL
Remove-Item -LiteralPath $tmpLogin -ErrorAction SilentlyContinue
$cookies = @{}
foreach ($line in $headers) {
  if ($line -imatch '^set-cookie:\s*([^=]+)=([^;]*)') { $cookies[$matches[1]] = $matches[2] }
}
$at = $cookies['access_token']
$csrf = [uri]::UnescapeDataString($cookies['csrf_token'])
if (-not $at -or -not $csrf) { throw 'Login cookies not found' }
Write-Host ('   logged in as {0}' -f $email) -ForegroundColor Gray

Write-Host ''
Write-Host '[2] Pick the first product from the catalog' -ForegroundColor Green
$prod = Invoke-API 'GET' '/products?page=1' | ConvertFrom-Json
$productId = $prod.data[0].id
$productName = $prod.data[0].name
$stockBefore = $prod.data[0].stock
Write-Host ('   {0}  (id={1})' -f $productName, $productId) -ForegroundColor Gray

Write-Host ''
Write-Host '[3] Add it to the cart' -ForegroundColor Green
Invoke-API 'POST' '/cart/items' ("{`"productId`":`"$productId`",`"quantity`":1}") `
  -Cookie "access_token=$at; csrf_token=$($cookies['csrf_token'])" -Csrf $csrf | Out-Null
Write-Host '   cart now has 1 item' -ForegroundColor Gray

Write-Host ''
Write-Host '[4] Create the order - PII goes into the request body' -ForegroundColor Green
$orderBody = "{`"receiverName`":`"$name`",`"receiverPhone`":`"$phone`",`"receiverAddress`":`"$address`",`"note`":`"$note`"}"
$orderRaw = Invoke-API 'POST' '/orders' $orderBody `
  -Cookie "access_token=$at; csrf_token=$($cookies['csrf_token'])" -Csrf $csrf
$order = $orderRaw | ConvertFrom-Json
$orderId = $order.id
Write-Host ('   order id = {0}' -f $orderId) -ForegroundColor Gray
Write-Host '   --- API response (DECRYPTED plaintext) ---' -ForegroundColor Gray
Write-Host ('   receiverName    : {0}' -f $order.receiverName)
Write-Host ('   receiverPhone   : {0}' -f $order.receiverPhone)
Write-Host ('   receiverAddress : {0}' -f $order.receiverAddress)
Write-Host ('   note            : {0}' -f $order.note)

Write-Host ''
Write-Host '[5] Read the SAME row directly from PostgreSQL (raw stored value)' -ForegroundColor Green
# Feed the query via stdin: PS 5.1 mangles embedded quotes in native argv,
# but stdin passes through untouched.
$sql = "SELECT `"receiverName`",`"receiverPhone`",`"receiverAddress`",note, total FROM `"Order`" WHERE id = '$orderId'"
$dbLine = ($sql | & docker exec -i $DbContainer psql -U $DbUser -d $DbName -t -A -F '|') -join ''
if (-not $dbLine) { throw 'Database row not found' }
$cols = $dbLine.Split('|')
Write-Host '   --- database row ---'
Write-Host ('   receiverName    : {0}' -f $cols[0])
Write-Host ('   receiverPhone   : {0}' -f $cols[1])
Write-Host ('   receiverAddress : {0}' -f $cols[2])
Write-Host ('   note            : {0}' -f $cols[3])
Write-Host ('   total (VND)     : {0}' -f $cols[4])

Write-Host ''
Write-Host '[6] Re-read it through the API - still plaintext (decrypt on read)' -ForegroundColor Green
$read = Invoke-API 'GET' "/orders/$orderId" -Cookie "access_token=$at" | ConvertFrom-Json
$shortId = $read.id.Substring(0, 8)
Write-Host ('   GET /orders/{0}... -> receiverName = {1}' -f $shortId, $read.receiverName)

Write-Host ''
Write-Host '====================================================================' -ForegroundColor Cyan
Write-Host ' VERDICT' -ForegroundColor Cyan
Write-Host '====================================================================' -ForegroundColor Cyan
$ok = $true
$fields = @(
  @{ Name = 'receiverName';    Api = $order.receiverName;    Db = $cols[0] },
  @{ Name = 'receiverPhone';   Api = $order.receiverPhone;   Db = $cols[1] },
  @{ Name = 'receiverAddress'; Api = $order.receiverAddress; Db = $cols[2] },
  @{ Name = 'note';            Api = $order.note;            Db = $cols[3] }
)
foreach ($f in $fields) {
  $encrypted = $f.Db -like 'enc:v1:*'
  $matches = $encrypted -and (-not $f.Db.Contains($f.Api))
  if ($matches) {
    Write-Host ("      {0,-16} plaintext '{1}'  =>  DB '{2}'  [OK encrypted]" -f $f.Name, $f.Api, $f.Db) -ForegroundColor Green
  } else {
    $ok = $false
    Write-Host ("      {0,-16} CHECK FAILED (api='{1}', db='{2}')" -f $f.Name, $f.Api, $f.Db) -ForegroundColor Red
  }
}
Write-Host ''
if ($ok) {
  Write-Host 'RESULT: PASS - All 4 PII fields stored as enc:v1: ciphertext in PostgreSQL,' -ForegroundColor Green
  Write-Host '        and returned as plaintext by the API.' -ForegroundColor Green
} else {
  Write-Host 'RESULT: FAIL - see mismatches above.' -ForegroundColor Red
}

Write-Host ''
Write-Host '[7] Cleanup: restore product stock, remove test order + user' -ForegroundColor Green
$cleanupSql = "UPDATE `"Product`" SET stock = stock + 1 WHERE id = '$productId'; DELETE FROM `"User`" WHERE email = '$email';"
$cleanupSql | & docker exec -i $DbContainer psql -U $DbUser -d $DbName | Out-Null
Write-Host '   done (restored 1 unit of stock, deleted user -> cascade deletes order).' -ForegroundColor Gray
Write-Host ''