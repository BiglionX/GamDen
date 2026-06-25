$bat = 'd:\GamDen\heredoc-env.bat'
$out = 'd:\GamDen\heredoc-env-result.txt'
'=== Heredoc .env decode ===' | Out-File $out -Encoding UTF8
Start-Process -FilePath $bat -NoNewWindow -Wait -PassThru -RedirectStandardOutput ($out + '.proc-out') -RedirectStandardError ($out + '.proc-err') | Out-Null
'DONE' | Out-File $out -Append -Encoding UTF8