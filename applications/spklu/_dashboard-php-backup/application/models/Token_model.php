<?php
use \Firebase\JWT\JWT;
class Token_model extends CI_Model {
	
	public function __construct() {
        parent::__construct();
    }
	

	
	public function buatTokenJWT($uid) {
		
		$private_key = $this->config->item('thekey');//.$uid;
		$now_seconds = time();
		$payload = array(
			"iat" => $now_seconds,
			"exp" => $now_seconds + (60 * 60 * 24 *30) ,  // Maximum expiration time is one hour
			"uid" => $uid,
		//	"data" => $data,
			
		);
		return JWT::encode($payload, $private_key, "HS256");
	}

	function getAuthorizationHeader(){
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        }
        else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { //Nginx or fast CGI
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            // Server-side fix for bug in old Android versions (a nice side-effect of this fix means we don't care about capitalization for Authorization)
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            //print_r($requestHeaders);
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        return $headers;
    }
	
	function getBearerToken() {
    $headers = $this->Token_model->getAuthorizationHeader();
	
    // HEADER: Get the access token from the header
		if (!empty($headers)) {
			if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
				return $matches[1];
			}
		}
		return null;
	}
	
	function getheadernis() {
		$headers = $this->getallheaders();;
		$nis = $headers['Nik'];
		return $nis;
	}
	
	
	 function getallheaders() {
		$headers = [];
		foreach ($_SERVER as $name => $value) {
			if (substr($name, 0, 5) == 'HTTP_') {
				$headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
			}
		}
		return $headers;
    }
	
	function is_jwt_valid($jwt, $secret = 'secret') {
		// split the jwt
		$tokenParts = explode('.', $jwt);
		$header = base64_decode($tokenParts[0]);
		$payload = base64_decode($tokenParts[1]);
		$signature_provided = $tokenParts[2];

		// check the expiration time - note this will cause an error if there is no 'exp' claim in the jwt
		$expiration = json_decode($payload)->exp;
		$is_token_expired = ($expiration - time()) < 0;

		// build a signature based on the header and payload using the secret
		$base64_url_header = $this->base64url_encode($header);
		$base64_url_payload = $this->base64url_encode($payload);
		$signature = hash_hmac('SHA256', $base64_url_header . "." . $base64_url_payload, $secret, true);
		$base64_url_signature = $this->base64url_encode($signature);

		// verify it matches the signature provided in the jwt
		$is_signature_valid = ($base64_url_signature === $signature_provided);
		
		if ($is_token_expired || !$is_signature_valid) {
			return FALSE;
		} else {
			return TRUE;
		}
	}
	
	function base64url_encode($str) {
		return rtrim(strtr(base64_encode($str), '+/', '-_'), '=');
	}
	
}