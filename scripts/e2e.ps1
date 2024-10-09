$ENV:CODE_TESTS_PATH="$(Get-Location)\client\out\test"
$ENV:CODE_TESTS_WORKSPACE="$(Get-Location)\client\testFixture"
Invoke-Expression "node $(Get-Location)\client\out\test\runTest.js"
