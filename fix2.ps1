$bat = 'd:\GamDen\fix2.bat'
$out = 'd:\GamDen\fix2-result.txt'
'=== Fix2: env + redis + restart ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8