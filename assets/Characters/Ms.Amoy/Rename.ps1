Get-ChildItem -Path "$PSScriptRoot/Cocos/Animations" -Filter *.fbx `
| Where-Object Name -NotMatch "MainHero@.*" `
| ForEach-Object {
    $newName = "MainHero@$($_.Name)"
    Write-Host "Rename $($_.FullName) to $newName"
    Rename-Item $_.FullName -NewName $newName
}