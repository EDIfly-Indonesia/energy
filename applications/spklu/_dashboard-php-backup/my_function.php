<?php


function categoryName($category_id)
{

    global $con;
    $sql = mysqli_query($con, "SELECT * FROM product_category WHERE product_category_id='$category_id'");
    $category_data = mysqli_fetch_assoc($sql);
    $category_name = $category_data['product_category_name'];

    return $category_name;
}


function weightUnit($weight_unit_id)
{

    global $con;
    $sql = mysqli_query($con, "SELECT * FROM weight_unit WHERE weight_unit_id='$weight_unit_id'");
    $weight_unit_data = mysqli_fetch_assoc($sql);
    $weight_unit_name = $weight_unit_data['weight_unit_name'];
    return $weight_unit_name;
}


function supplierName($suppliers_id)
{

    global $con;
    $sql = mysqli_query($con, "SELECT * FROM suppliers WHERE suppliers_id='$suppliers_id'");
    $suppliers_data = mysqli_fetch_assoc($sql);
    $suppliers_name = $suppliers_data['suppliers_name'];
    return $suppliers_name;
}


function shopNameById($shop_id)
{

    global $con;
    $sql = mysqli_query($con, "SELECT * FROM shop WHERE shop_id='$shop_id'");
    $shop_data = mysqli_fetch_assoc($sql);
    $shop_name = $shop_data['shop_name'];
    return $shop_name;
}


function getTotalExpense()
{
    global $con;
//  $result = mysqli_query($con,"SELECT SUM('product_price') AS value_sum FROM order_details");
//  $row = mysqli_fetch_assoc($result);
//  $sum = $row['value_sum'];
    $sql = mysqli_query($con, "SELECT SUM(expense_amount) as total FROM expense");
    $row = mysqli_fetch_array($sql);
    $sum = $row['total'];

    return $sum;
}


function getTotalExpenseByShop($shop_id,$year)
{
    global $con;
    $sql = mysqli_query($con, "SELECT SUM(expense_amount) as total FROM expense WHERE shop_id='$shop_id' AND  YEAR(STR_TO_DATE(expense_date,'%Y-%m-%d')) = '$year' ");
    $row = mysqli_fetch_array($sql);
    $sum = $row['total'];

    return $sum;
}


function getTotalExpenseByShopDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $sql = mysqli_query($con, "SELECT SUM(expense_amount) as total FROM expense WHERE shop_id='$shop_id' AND expense_date>='$from_date' AND expense_date<='$to_date'");
    $row = mysqli_fetch_array($sql);
    $sum = $row['total'];

    return $sum;
}



function getTotalOrderPrice($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(order_price_before) AS value_sum FROM order_list WHERE shop_id='$shop_id' and month(order_date)=month(now()) and year(order_date)=year(now()) ");
    $row = mysqli_fetch_assoc($result);
    $sum = $row['value_sum'];

    return $sum;
}

function getTotalOrderPriceDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(order_price) AS value_sum FROM order_list WHERE shop_id='$shop_id' AND order_date>='$from_date' AND order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $sum = $row['value_sum'];

    return $sum;
}


function getTotalOrderPriceAll($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(product_price) AS value_sum FROM order_details WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $sum = $row['value_sum'];

    return $sum;
}


function getTotalDiscount($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(discount) AS value_discount FROM order_list WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_discount = $row['value_discount'];
    return $total_discount;
}


function getTotalDiscountDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(discount) AS value_discount FROM order_list WHERE shop_id='$shop_id' AND order_date>='$from_date' AND order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $total_discount = $row['value_discount'];
    return $total_discount;
}


function getTotalCgst($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(cgst) AS value_cgst FROM order_details WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_cgst = $row['value_cgst'];
    return $total_cgst;
}


function getTotalCgstDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(cgst) AS value_cgst FROM order_details WHERE shop_id='$shop_id' AND product_order_date>='$from_date' AND product_order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $total_cgst = $row['value_cgst'];
    return $total_cgst;
}


function getTotalSgst($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(sgst) AS value_sgst FROM order_details WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_sgst = $row['value_sgst'];
    return $total_sgst;
}

function getTotalSgstDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(sgst) AS value_sgst FROM order_details WHERE shop_id='$shop_id' AND product_order_date>='$from_date' AND product_order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $total_sgst = $row['value_sgst'];
    return $total_sgst;
}


function getTotalCess($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(cess) AS value_cess FROM order_details WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_cess = $row['value_cess'];
    return $total_cess;
}


function getTotalCessDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(cess) AS value_cess FROM order_details WHERE shop_id='$shop_id' AND product_order_date>='$from_date' AND product_order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $total_cess = $row['value_cess'];
    return $total_cess;
}



function getTotalDiscountAll($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(discount) AS value_discount FROM order_list WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_discount = $row['value_discount'];
    return $total_discount;
}


function getTotalTax($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(tax) AS value_tax FROM order_list WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_tax = $row['value_tax'];

    return $total_tax;
}

function getTotalTaxDateRange($shop_id,$from_date,$to_date)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(tax) AS value_tax FROM order_list WHERE shop_id='$shop_id' AND order_date>='$from_date' AND order_date<='$to_date'");
    $row = mysqli_fetch_assoc($result);
    $total_tax = $row['value_tax'];

    return $total_tax;
}




function getTotalTaxAll($shop_id)
{
    global $con;
    $result = mysqli_query($con, "SELECT SUM(tax) AS value_tax FROM order_list WHERE shop_id='$shop_id'");
    $row = mysqli_fetch_assoc($result);
    $total_tax = $row['value_tax'];

    return $total_tax;
}


function getCurrency()
{
    global $con;
    $result = mysqli_query($con, "SELECT currency_symbol FROM shop WHERE shop_id=1 ");
    $row = mysqli_fetch_assoc($result);
    $currency = $row['currency_symbol'];

    return $currency;
}


//calculate total price in month
function getMonthlySalesAmount($month, $getYear, $shop_id)
{

    global $con;
    $totalCost = 0;

    $year = $getYear;


    $sql = "SELECT * FROM order_list WHERE shop_id='$shop_id' AND MONTH(STR_TO_DATE(order_date,'%Y-%m-%d')) = '$month' AND YEAR(STR_TO_DATE(order_date,'%Y-%m-%d')) = '$year'";


    $result = mysqli_query($con, $sql);

    while ($row = mysqli_fetch_array($result)) {
        $cost = floatval($row['order_price_before']);
        $totalCost = $totalCost + $cost;
    }


    return $totalCost;

}


//calculate total price in month
function getMonthlyExpense($month, $getYear, $shop_id)
{

    global $con;
    $totalExpense = 0;

    $year = $getYear;


    $sql = "SELECT * FROM expense WHERE shop_id='$shop_id' AND  MONTH(STR_TO_DATE(expense_date,'%Y-%m-%d')) = '$month' AND YEAR(STR_TO_DATE(expense_date,'%Y-%m-%d')) = '$year'";

    $result = mysqli_query($con, $sql);

    while ($row = mysqli_fetch_array($result)) {
        $cost = floatval($row['expense_amount']);
        $totalExpense = $totalExpense + $cost;
    }

    return $totalExpense;

}


function time_elapsed_string($datetime, $full = false)
{

    //set default time zone
    date_default_timezone_set("Asia/Dhaka");

    $now = new DateTime;
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);

    $diff->w = floor($diff->d / 7);
    $diff->d -= $diff->w * 7;

    $string = array(
        'y' => 'year',
        'm' => 'month',
        'w' => 'week',
        'd' => 'day',
        'h' => 'hour',
        'i' => 'minute',
        's' => 'second',
    );
    foreach ($string as $k => &$v) {
        if ($diff->$k) {
            $v = $diff->$k . ' ' . $v . ($diff->$k > 1 ? 's' : '');
        } else {
            unset($string[$k]);
        }
    }

    if (!$full) $string = array_slice($string, 0, 1);
    return $string ? implode(', ', $string) . ' ago' : 'just now';
}


function getProductStock($product_id)
{

    global $con;
    $sql = mysqli_query($con, "SELECT * FROM products WHERE product_id='$product_id'");
    $product_data = mysqli_fetch_assoc($sql);
    $product_stock = $product_data['product_stock'];
    return $product_stock;
}


function getAmountInWord($number)
{
    $decimal = round($number - ($no = floor($number)), 2) * 100;
    $hundred = null;
    $digits_length = strlen($no);
    $i = 0;
    $str = array();
    $words = array(0 => '', 1 => 'one', 2 => 'two',
        3 => 'three', 4 => 'four', 5 => 'five', 6 => 'six',
        7 => 'seven', 8 => 'eight', 9 => 'nine',
        10 => 'ten', 11 => 'eleven', 12 => 'twelve',
        13 => 'thirteen', 14 => 'fourteen', 15 => 'fifteen',
        16 => 'sixteen', 17 => 'seventeen', 18 => 'eighteen',
        19 => 'nineteen', 20 => 'twenty', 30 => 'thirty',
        40 => 'forty', 50 => 'fifty', 60 => 'sixty',
        70 => 'seventy', 80 => 'eighty', 90 => 'ninety');
    $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
    while ($i < $digits_length) {
        $divider = ($i == 2) ? 10 : 100;
        $number = floor($no % $divider);
        $no = floor($no / $divider);
        $i += $divider == 10 ? 1 : 2;
        if ($number) {
            $plural = (($counter = count($str)) && $number > 9) ? 's' : null;
            $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
            $str [] = ($number < 21) ? $words[$number] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($number / 10) * 10] . ' ' . $words[$number % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
        } else $str[] = null;
    }
    $Rupees = implode('', array_reverse($str));
    $paise = ($decimal > 0) ? "." . ($words[$decimal / 10] . " " . $words[$decimal % 10]) . ' Paise' : '';
    return ($Rupees ? $Rupees . 'Taka ' : '') . $paise;
}


?>
