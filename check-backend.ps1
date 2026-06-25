$out = 'd:\GamDen\check-direct.txt'
$bat = 'd:\GamDen\check-backend.bat'
'=== Direct check ===' | Out-File $out -Encoding UTF8
$proc = Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err')
'ExitCode=' + $proc.ExitCode | Out-File $out -Append -Encoding UTF8
'BATCH-DONE' | Out-File $out -Append -Encoding UTF8