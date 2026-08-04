$PlayWav=New-Object System.Media.SoundPlayer

Write-Host $PWD

$PlayWav.SoundLocation = Join-Path $PSScriptRoot "finished.wav"
$PlayWav.playsync()