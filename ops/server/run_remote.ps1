param(
  [Parameter(Mandatory=$true)][string]$Host,
  [Parameter(Mandatory=$true)][string]$User,
  [string]$KeyPath = "$HOME/.ssh/id_rsa",
  [string]$RemoteDir = "~/tuition-scheduler",
  [string]$EnvFile = "ops/server/.deploy.env"
)

$ErrorActionPreference = "Stop"

Write-Host "Uploading project..."
ssh -i $KeyPath "$User@$Host" "mkdir -p $RemoteDir"
rsync -avz --delete -e "ssh -i $KeyPath" ./ "$User@$Host:$RemoteDir/" --exclude ".git" --exclude "node_modules" --exclude ".next"

Write-Host "Setting execute bits..."
ssh -i $KeyPath "$User@$Host" "cd $RemoteDir && chmod +x ops/server/scripts/*.sh"

Write-Host "Run in order on server:"
Write-Host "1) sudo bash $RemoteDir/ops/server/scripts/bootstrap_server.sh $RemoteDir/$EnvFile"
Write-Host "2) sudo -u deploy bash $RemoteDir/ops/server/scripts/deploy_app.sh $RemoteDir/$EnvFile"
Write-Host "3) sudo bash $RemoteDir/ops/server/scripts/configure_nginx.sh $RemoteDir/$EnvFile"
Write-Host "4) sudo bash $RemoteDir/ops/server/scripts/setup_ssl.sh $RemoteDir/$EnvFile"
Write-Host "5) sudo bash $RemoteDir/ops/server/scripts/setup_backup_cron.sh $RemoteDir/$EnvFile"
