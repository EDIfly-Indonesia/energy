<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_marketing extends CI_Model {


	public function total_mitra() {
	   
		$sql = "SELECT COUNT(*) AS jml FROM owner";

		$data = $this->db->query($sql);

		return $data->row()->jml;
		
		}
		
		public function total_shop() {
	   
		$sql = "SELECT COUNT(*) AS jml FROM shop";

		$data = $this->db->query($sql);

		return $data->row()->jml;
		
		}
		
		public function total_fee_bulanan() {
	   
    		$sql = "SELECT sum(jumlah) as jml FROM histori_fee where jenis='penjualan' and month(tanggal)=month(now()) and  year(tanggal)=year(now()) ";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->jml;
		
		}
		
		public function getsaldo($noref) {
	       
    		$sql = "SELECT saldo FROM saldo_marketing where no_ref='$noref' ";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->saldo;
		
		}
		
		public function getstatuspenarikan($noref) {
	       
    		$sql = "SELECT count(id) jumproses FROM withdrawl where no_ref='$noref' and status='proses' ";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->jumproses;
		
		}
		
		public function total_pendaftar() {
	   
    		$sql = "SELECT count(*) as jml FROM shop where month(active_at)=month(now()) and year(active_at)=year(now())";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->jml;
		
		}
		
			public function total_pemasukan() {
	   
    		$sql = "SELECT sum(jumlah) as jml FROM iuran where month(tanggal)=month(now()) and year(tanggal)=year(now())";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->jml;
		
		}
		
		 public function grafiktoko(){
		     
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
            $query = $this->db->query("SELECT MONTH(active_at) AS month, count(*) AS total FROM 
            shop where year(active_at)=year(now()) group by month(active_at)  ORDER BY MONTH(active_at)");
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		  public function grafikpemasukan(){
		     
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
            $query = $this->db->query("SELECT MONTH(tanggal) AS month, sum(jumlah) AS total FROM 
            iuran where year(tanggal)=year(now()) group by month(tanggal) ORDER BY MONTH(tanggal)");
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		  public function grafiktransaksi_mitra(){
		      $idmitra=$this->session->id_role;
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT MONTH(order_date) AS month, sum(order_price) AS total FROM 
            order_list where year(order_date)=year(now()) and owner_id=? group by month(order_date) ORDER BY MONTH(order_date)";
            $query = $this->db->query($sql,[ $idmitra]);
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		  public function grafiktransaksiharian_mitra(){
		      $idmitra=$this->session->id_role;
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT day(order_date) AS tanggal, sum(order_price) AS total FROM 
            order_list where month(order_date)=month(curdate()) and year(order_date)=year(curdate()) and owner_id=? group by date(order_date) ORDER BY date(order_date)";
            $query = $this->db->query($sql,[ $idmitra]);
            
            
            
            return $query->result();

		 }
		 
		 public function grafikjumtransaksi_mitra(){
		      $idmitra=$this->session->id_role;
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT MONTH(order_date) AS month, count(1) AS total FROM 
            order_list where year(order_date)=year(now()) and owner_id=?  group by month(order_date) ORDER BY MONTH(order_date)";
            $query = $this->db->query($sql,[ $idmitra]);
            $hasil = [];
            
            
            return $query->result();

		 }
		
	
		 
		 	 public function jumlahtransaksi_bulanan(){
		     
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
            $query = $this->db->query("SELECT MONTH(tanggal) AS month, count(1) AS total FROM 
            histori_fee where jenis='penjualan' and year(tanggal)=year(now()) ORDER BY MONTH(tanggal)");
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		 
		 public function jumtoko_mitra(){
		     $idmitra=$this->session->id_role;
		     	$sql = "SELECT COUNT(*) as jml FROM shop where shop_owner_id=?";
    
    		$data = $this->db->query($sql,[$idmitra]);
    
    		return $data->row()->jml;
		    
		 }
		 
		 public function totaltransaksi_bulanan_mitra(){
		     $idmitra=$this->session->id_role;
		     $sql = "SELECT sum(order_price) as jml FROM order_list where (month(order_date)=month(now()) and  year(order_date)=year(now())) and owner_id=? ";
    
    		$data = $this->db->query($sql,[$idmitra]);
    
    		return $data->row()->jml;
		    
		 }
		 
		 public function dataharian_mitra(){
		     $idmitra=$this->session->id_role;
		     $sql = "SELECT sum(penjualan) as penjualan,sum(hpp) as hpp,sum(pengeluaran) as pengeluaran,sum(jum_trans) as jum_trans,sum(jml_item) as jml_item,
		     sum(kas_masuk) as kas_masuk,sum(kas_keluar) as kas_keluar
		     FROM statistik_harian where tanggal=curdate() and owner_id=? ";
    
    		$data = $this->db->query($sql,[$idmitra]);
    
    		return $data->row();
		    
		 }
		 
		  public function totalpengeluaran_bulanan_mitra(){
		     $idmitra=$this->session->id_role;
		     $sql = "SELECT sum(expense_amount) as jml FROM expense where (month(expense_date)=month(now()) and  year(expense_date)=year(now())) and owner_id=? ";
    
    		$data = $this->db->query($sql,[$idmitra]);
    
    		return $data->row()->jml;
		    
		 }
		 
		 public function totalmodal_bulanan_mitra(){
		      $idmitra=$this->session->id_role;
		     $sql = "SELECT sum(total_buy) as jml FROM order_list where (month(order_date)=month(now()) and  year(order_date)=year(now())) and owner_id=? ";
    
    		$data = $this->db->query($sql,[$idmitra]);
    
    		return $data->row()->jml;
		    
		 }
		
	    public function getdaftartoko($id) {
		    //$tipe=$this->session->type;
		    
		$sql = "SELECT shop_id as id,shop_name as namatoko from shop where shop_owner_id=? and shop_status='OPEN' and active_at <=now() and active_to >=now()";
		$data = $this->db->query($sql,[$id]);
		return $data->result();
	    }
	    
	     public function getdaftarmitra() {
		    //$tipe=$this->session->type;
		    
    		$sql = "SELECT owner_id as id,owner_name as namamitra from owner";
    		$data = $this->db->query($sql);
    		return $data->result();
	    }	
	    public function getdaftarsupplier($idtoko) {
    		    //$tipe=$this->session->type;
    		    
    		$sql = "SELECT suppliers_id as id,suppliers_name as namasupplier from suppliers where shop_id=? and status=1 ";
    		$data = $this->db->query($sql,[$idtoko]);
    		return $data->result();
	    }
	
}

