$bat = 'd:\GamDen\upload-env.bat'
$out = 'd:\GamDen\upload-env-result.txt'
'=== Upload .env + restart ===' | Out-File $out -Encoding UTF8
$proc = Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err')
'ExitCode=' + $proc.ExitCode | Out-File $out -Append -Encoding UTF8
'DONE' | Out-File $out -Append -Encoding UTF8