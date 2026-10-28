<?php
class Auth_model extends CI_Model {
	
	public $todayDate;
	
	public function __construct() {
        parent::__construct();
		$todayDate = date('Y-m-d');
    }
	
	
	
	public function ceklogin($email,$password) {
		
		$pass=md5($password);
		
		$sql = "SELECT id as id_pelanggan,nama_pelanggan,no_hp,email,id_alamat FROM pelanggan where email=? and password=? ";
		$result = $this->db->query($sql, [$email, $pass]);
		
	
		
		if ($result->num_rows() > 0) {
			return $result->row();
		} else {
			return null;
		}
	}
	
	public function cekpassword($id,$password) {
		
		$pass=md5($password);
		
		$sql = "SELECT id FROM pelanggan where id=? and password=? ";
		$result = $this->db->query($sql, [$id, $pass]);
		
	
		
		if ($result->num_rows() == 1) {
			return true;
		} else {
			return false;
		}
	}
	
	public function cekemail($email) {
		
		
		
		$sql = "SELECT id FROM pelanggan where email=? limit 1";
		$result = $this->db->query($sql, [$email]);
		
		
		
		if ($result->num_rows() == 1) {
			return true;
		} else {
			return false;
		}
	}
	
	
	
}