$bat = 'd:\GamDen\check-env.bat'
$out = 'd:\GamDen\check-env-result.txt'
'=== Check .env ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'BATCH-DONE' | Out-File $out -Append -Encoding UTF8