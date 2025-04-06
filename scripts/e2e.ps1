$ENV:CODE_TESTS_PATH="$(Get-Location)\dist\client\out\test"
$ENV:CODE_TESTS_WORKSPACE="$(Get-Location)\test\fixtures"
Invoke-Expression "node $(Get-Location)\dist\client\out\test\runTest.js"
