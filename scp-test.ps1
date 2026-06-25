$bat = 'd:\GamDen\scp-test.bat'
$out = 'd:\GamDen\scp-test-result.txt'
'=== SCP test ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8