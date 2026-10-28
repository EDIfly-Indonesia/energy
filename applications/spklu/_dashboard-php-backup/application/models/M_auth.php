<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_auth extends CI_Model {
	public function login($user, $pass) {
		$hasil=false;
		
		
		$this->db->select('*');
		$this->db->from('t_users_admin');
		$this->db->where('code', $user);
		$this->db->where('password', md5($pass));

		$data = $this->db->get();

		if ($data->num_rows() == 1) {
			
			
			$hasil=true;
			$data=$data->row();
			
		} else {
			$data="User tidak ditemukan";
		}
		
		$datakirim["hasil"]=$hasil;
		$datakirim["data"]=$data;
		
		return $datakirim;
	}
	
	
}

/* End of file M_auth.php */
/* Location: ./application/models/M_auth.php */