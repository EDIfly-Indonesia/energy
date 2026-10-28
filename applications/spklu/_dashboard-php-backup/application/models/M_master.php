<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_master extends CI_Model {
	
    
   
	
	 public function data_mitra() {
		$queryowner=getqueryowner();
		$sql = "SELECT id_mitra as id,`name` FROM t_mitra o where id_mitra > -1 $queryowner ";

		$data = $this->db->query($sql);

		return $data->result();
	}

    public function data_chargebox() {
		$queryowner=getqueryowner();
		$sql = "SELECT chargebox_id as id, nama_chargebox   as name FROM t_chargebox o where chargebox_id !='' $queryowner ";

		$data = $this->db->query($sql);

		return $data->result();
	}
	
	 public function data_biaya() {
		$queryowner=getqueryowner();
		$sql = "SELECT id_biaya as id, nama_biaya as name FROM t_biaya o where id_mitra >-1 $queryowner ";

		$data = $this->db->query($sql);

		return $data->result();
	}
	
	public function data_user() {
		$queryowner=getqueryowner();
		$sql = "SELECT id_user as id, nama as name FROM t_user_mobile o where id_user <>0 $queryowner ";

		$data = $this->db->query($sql);

		return $data->result();
	}
	
	public function data_jenismember() {
		$queryowner=getqueryowner();
		$sql = "SELECT id_jenismember as id, nama_member as name FROM t_jenismember o where id_mitra !='' $queryowner ";

		$data = $this->db->query($sql);

		return $data->result();
	}

	public function ppn() {
		$sql = "SELECT coalesce(value_setting,'') as ppn FROM t_setting where nama_setting='ppn'";

		$data = $this->db->query($sql);
		if ($data->num_rows() > 0){
			return $data->row()->ppn ;
		}
		else{
			return "0";
		}
	}
	public function pbjt() {
		$sql = "SELECT coalesce(value_setting,'') as pbjt FROM t_setting where nama_setting='pbjt'";

		$data = $this->db->query($sql);
		if ($data->num_rows() > 0){
			return $data->row()->pbjt ;
		}
		else{
			return "0";
		}
	}
	
	public function adminwallet($jenis="admin_wallet") {
		$sql = "SELECT coalesce(value_setting,'') as idadminwallet FROM t_setting where nama_setting='$jenis'";
		
		$data = $this->db->query($sql);
		if ($data->num_rows() > 0){
			return $data->row()->idadminwallet ;
		}
		else{
			return "0";
		}
	}


	public function lokasi(){
		$queryowner=getqueryowner();
		$sql = "SELECT chargebox_id as id, nama_chargebox as `name`,lat,  lng 
		FROM t_chargebox o where (lat is not null and  lat!=0) and (lng is not null and  lng!=0) $queryowner";

		$data = $this->db->query($sql);

		return $data->result();
	}


	

	
}

/* End of file M_pegawai.php */
/* Location: ./application/models/M_pegawai.php */