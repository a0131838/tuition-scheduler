$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mdPath = Join-Path $repoRoot "docs\\tuition-scheduler-user-guide.md"
$docxOut = Join-Path $repoRoot "docs\\tuition-scheduler-user-guide.docx"

if (!(Test-Path -LiteralPath $mdPath)) {
  throw "Missing markdown: $mdPath"
}

function XmlEsc([string]$s) {
  return $s.
    Replace("&", "&amp;").
    Replace("<", "&lt;").
    Replace(">", "&gt;").
    Replace('"', "&quot;").
    Replace("'", "&apos;")
}

$lines = Get-Content -LiteralPath $mdPath
$paras = foreach ($line in $lines) {
  $t = XmlEsc($line)
  if ([string]::IsNullOrWhiteSpace($t)) {
    "<w:p/>"
  } else {
    "<w:p><w:r><w:t xml:space=""preserve"">$t</w:t></w:r></w:p>"
  }
}

$docXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $($paras -join "`n    ")
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$typesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"@

$relsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$tmp = Join-Path $env:TEMP ("ts_docx_" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "word") | Out-Null

Set-Content -LiteralPath (Join-Path $tmp "[Content_Types].xml") -Value $typesXml -NoNewline -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tmp "_rels\\.rels") -Value $relsXml -NoNewline -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tmp "word\\document.xml") -Value $docXml -NoNewline -Encoding UTF8

$zip = Join-Path $tmp "out.zip"
Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $zip -Force

if (Test-Path -LiteralPath $docxOut) {
  Remove-Item -LiteralPath $docxOut -Force
}
Move-Item -LiteralPath $zip -Destination $docxOut -Force

Remove-Item -LiteralPath $tmp -Recurse -Force

Write-Host "Wrote $docxOut"

