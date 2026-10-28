<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_barang extends CI_Model {


	
		
		
		 
		 
	
		
	    public function getdaftartoko($id) {
		    //$tipe=$this->session->type;
		    
		$sql = "SELECT shop_id as id,shop_name as namatoko from shop where shop_owner_id=? and shop_status='OPEN' and active_at <=now() and active_to >=now()";
		$data = $this->db->query($sql,[$id]);
		return $data->result();
	    }
	    
	     public function getdatakategorifromshop($idtoko) {
		    //$tipe=$this->session->type;
		    if($idtoko==0){
		        $idtoko=getidrole();
    		$sql = "SELECT product_category_id as id,product_category_name as namakategori from product_category where owner_id=? and status=1";
		    }
    		else 	$sql = "SELECT product_category_id as id,product_category_name as namakategori from product_category where shop_id=? and status=1";
    		$data = $this->db->query($sql,[$idtoko]);
    		return $data->result();
	    }
	    
	    public function getdaftarkategoribymitra($idmitra) {
		    //$tipe=$this->session->type;
		    
    		$sql = "SELECT product_category_id as id,product_category_name as namakategori from product_category where owner_id=? and status=1";
    		$data = $this->db->query($sql,[$idmitra]);
    		return $data->result();
	    }
	  
}

