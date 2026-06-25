$bat = 'd:\GamDen\inspect-pg.bat'
$out = 'd:\GamDen\inspect-pg-result.txt'
'=== Inspect PG + start redis ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8