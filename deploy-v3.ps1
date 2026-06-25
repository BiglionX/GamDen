$bat = 'd:\GamDen\deploy-v3.bat'
$out = 'd:\GamDen\deploy4-result.txt'
'=== Deploy v3 start ===' | Out-File $out -Encoding UTF8
$proc = Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err')
'ExitCode=' + $proc.ExitCode | Out-File $out -Append -Encoding UTF8
'DONE' | Out-File $out -Append -Encoding UTF8