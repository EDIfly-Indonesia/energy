<?php

var_dump(extension_loaded('curl'));
$total=1000;
$email="farid0810@gmail.com";
$hp="085720509191";
$username="faridsya";
$noorder="823131";
$namatoko="AilaSHop";
$periode="yearly";
$responduitku=buattagihan($total,$email,$hp,$username,$noorder,$namatoko,$periode);
var_dump($responduitku);
 function buattagihan($total,$email,$hp,$name,$orderId,$namatoko,$periode){
      
       $parm = array(
        'email' => $email,
        'nama' => $name,
        'namatoko' => $namatoko,
        'periode' => $periode,
        
    );
      
       
    $merchantCode = 'D11822'; // dari duitku  prod
    $merchantKey = 'c527743831fa66f681d851eed9c21d31'; // dari duitku prod
    
    // $merchantCode = 'DS15993'; // dari duitku  dev
    // $merchantKey = '4ed65e253d16c8a38dba2fdc4a4c6365'; // dari duitku dev
    
    

    $timestamp = round(microtime(true) * 1000); //in milisecond
    $paymentAmount = $total;
    $merchantOrderId = $orderId; // dari merchant, unique
    $productDetails = 'Pengaktifan Toko';
    $email = $email; // email pelanggan merchant
    $phoneNumber = $hp; // nomor tlp pelanggan merchant (opsional)
    $additionalParam =json_encode($parm) ; // opsional
    $merchantUserInfo = $email; // opsional
    $customerVaName = $name; // menampilkan nama pelanggan pada tampilan konfirmasi bank
    $callbackUrl = 'https://apiv2.ailapos.com/callbackduitku'; // url untuk callback
    $returnUrl = 'https://admin.ailapos.com/shop/datatoko';//'http://example.com/return'; // url untuk redirect
    $expiryPeriod = 1440; // untuk menentukan waktu kedaluarsa dalam menit
    $signature = hash('sha256', $merchantCode.$timestamp.$merchantKey);
    //$paymentMethod = 'VC'; //digunakan untuk direksional pembayaran

    // Detail pelanggan
    $firstName = $name;
    $lastName = "";

    // Alamat
    $alamat = "";
    $city = "";
    $postalCode = "";
    $countryCode = "ID";

    $address = array(
        'firstName' => $firstName,
        'lastName' => $lastName,
        'address' => $alamat,
        'city' => $city,
        'postalCode' => $postalCode,
        'phone' => $hp,
        'countryCode' => $countryCode
    );

    $customerDetail = array(
        'firstName' => $firstName,
        'lastName' => $lastName,
        'email' => $email,
        'phoneNumber' => $hp,
        'billingAddress' => $address,
        'shippingAddress' => $address
    );


    $item1 = array(
        'name' => 'Pengaktifan toko',
        'price' => $paymentAmount,
        'quantity' => 1);

    // $item2 = array(
    //     'name' => 'Test Item 2',
    //     'price' => 30000,
    //     'quantity' => 3);

    $itemDetails = array(
        $item1
    );

    /*Khusus untuk metode pembayaran Kartu Kredit
    $creditCardDetail = array (
        'acquirer' => '014',
        'binWhitelist' => array (
            '014',
            '400000'
        )
    );*/

    $params = array(
        'paymentAmount' => $paymentAmount,
        'merchantOrderId' => $merchantOrderId,
        'productDetails' => $productDetails,
        'additionalParam' => $additionalParam,
        'merchantUserInfo' => $merchantUserInfo,
        'customerVaName' => $customerVaName,
        'email' => $email,
        'phoneNumber' => $phoneNumber,
        'itemDetails' => $itemDetails,
        'customerDetail' => $customerDetail,
        //'creditCardDetail' => $creditCardDetail,
        'callbackUrl' => $callbackUrl,
        'returnUrl' => $returnUrl,
        'expiryPeriod' => $expiryPeriod
        //'paymentMethod' => $paymentMethod
    );

    $params_string = json_encode($params);
    //echo $params_string;
    //$url = 'https://api-sandbox.duitku.com/api/merchant/createinvoice'; // Sandbox
     $url = 'https://api-prod.duitku.com/api/merchant/createInvoice'; // Production

    //log transaksi untuk debug 
    // file_put_contents('log_createInvoice.txt', "* log *\r\n", FILE_APPEND | LOCK_EX);
    // file_put_contents('log_createInvoice.txt', $params_string . "\r\n\r\n", FILE_APPEND | LOCK_EX);
    // file_put_contents('log_createInvoice.txt', 'x-duitku-signature:' . $signature . "\r\n\r\n", FILE_APPEND | LOCK_EX);
    // file_put_contents('log_createInvoice.txt', 'x-duitku-timestamp:' . $timestamp . "\r\n\r\n", FILE_APPEND | LOCK_EX);
    // file_put_contents('log_createInvoice.txt', 'x-duitku-merchantcode:' . $merchantCode . "\r\n\r\n", FILE_APPEND | LOCK_EX);
    $ch = curl_init();


    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
    curl_setopt($ch, CURLOPT_POSTFIELDS, $params_string);                                                                  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);                                                                      
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(                                                                          
        'Content-Type: application/json',                                                                                
        'Content-Length: ' . strlen($params_string),
        'x-duitku-signature:' . $signature ,
        'x-duitku-timestamp:' . $timestamp ,
        'x-duitku-merchantcode:' . $merchantCode    
        )                                                                       
    );   
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

    //execute post
    $request = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if($httpCode == 200)
    {
        $result = json_decode($request, true);
       return $result;
        //header('location: '. $result['paymentUrl']);
       // print_r($result, false);
        // echo "paymentUrl :". $result['paymentUrl'] . "<br />";
        // echo "reference :". $result['reference'] . "<br />";
        // echo "statusCode :". $result['statusCode'] . "<br />";
        // echo "statusMessage :". $result['statusMessage'] . "<br />";
    }
    else
    {
        // echo $httpCode . " " . $request ;
        echo $request ;
    }
  }
?>