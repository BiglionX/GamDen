$bat = 'd:\GamDen\b64-env.bat'
$out = 'd:\GamDen\b64-env-result.txt'
'=== Base64 upload .env + restart ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8