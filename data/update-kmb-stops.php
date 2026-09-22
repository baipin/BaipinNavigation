<?php
declare(strict_types=1);

$url = 'https://data.etabus.gov.hk/v1/transport/kmb/stop/';
$target = __DIR__ . DIRECTORY_SEPARATOR . 'kmb-stops.json';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 20,
        'header' => "User-Agent: BaipinNavigation/1.0\r\nAccept: application/json\r\n",
    ],
]);

$payload = @file_get_contents($url, false, $context);
if ($payload === false) {
    http_response_code(502);
    echo "Unable to fetch KMB stop data.\n";
    exit(1);
}

$decoded = json_decode($payload, true);
if (!is_array($decoded) || !isset($decoded['data']) || !is_array($decoded['data'])) {
    http_response_code(502);
    echo "KMB stop data has an unexpected format.\n";
    exit(1);
}

$json = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
if (file_put_contents($target, $json . PHP_EOL, LOCK_EX) === false) {
    http_response_code(500);
    echo "Unable to write " . $target . ".\n";
    exit(1);
}

echo "Updated " . count($decoded['data']) . " KMB stops.\n";
