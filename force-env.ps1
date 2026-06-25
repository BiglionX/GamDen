$bat = 'd:\GamDen\force-env.bat'
$out = 'd:\GamDen\force-env-result.txt'
'=== Force .env decode via bash -c ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8