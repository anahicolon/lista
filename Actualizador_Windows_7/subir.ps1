try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]3072 # TLS 1.2
} catch {}

$candidates = @("D:\DATOS\Trabajo\Tablet ultima.xlsx", "D:\DATOS\Trabajo\Tablet ultima.xls")
$filePath = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $filePath = $c; break }
}

if (-not $filePath) {
    Write-Host "[ERROR] No se encontro Tablet ultima.xls ni Tablet ultima.xlsx en D:\DATOS\Trabajo" -ForegroundColor Red
    exit 1
}

$url = "https://lista-rpuy.onrender.com/api/upload"
Write-Host "Subiendo $([System.IO.Path]::GetFileName($filePath)) a la web..." -ForegroundColor Cyan

try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileName = [System.IO.Path]::GetFileName($filePath)
    $LF = "`r`n"

    $header = "--$boundary$LF" +
              "Content-Disposition: form-data; name=`"excel`"; filename=`"$fileName`"$LF" +
              "Content-Type: application/vnd.ms-excel$LF$LF"

    $footer = "$LF--$boundary--$LF"

    $enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
    $headerBytes = $enc.GetBytes($header)
    $footerBytes = $enc.GetBytes($footer)

    $totalLength = $headerBytes.Length + $fileBytes.Length + $footerBytes.Length

    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = "POST"
    $req.ContentType = "multipart/form-data; boundary=$boundary"
    $req.ContentLength = $totalLength
    $req.Timeout = 90000

    $stream = $req.GetRequestStream()
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($fileBytes, 0, $fileBytes.Length)
    $stream.Write($footerBytes, 0, $footerBytes.Length)
    $stream.Close()

    $resp = $req.GetResponse()
    $streamReader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $result = $streamReader.ReadToEnd()
    Write-Host "`n✅ ¡EXITO! Precios actualizados en la web en vivo." -ForegroundColor Green
    Write-Host "Respuesta: $result"
    Write-Host "Catalogo web: https://lista-rpuy.onrender.com"
    Write-Host "Lista WhatsApp: https://lista-rpuy.onrender.com/lista.html"
} catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}
