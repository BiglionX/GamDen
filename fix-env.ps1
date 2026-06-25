$bat = 'd:\GamDen\fix-env.bat'
$out = 'd:\GamDen\fix-env-result.txt'
'=== Fix .env + restart ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8