<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_mitra extends CI_Model {


	public function total_charge() {
	   $queryowner=getqueryowner();
	   
		$sql = "SELECT COUNT(*) AS jml FROM t_chargebox o where id_chargebox>0 $queryowner";

		$data = $this->db->query($sql);

		return $data->row()->jml;
		
		}
		
		public function total_tenant() {
		    
	    $tipe=$this->session->type_id;
	   
	   
		$sql = "SELECT COUNT(*) AS jml FROM t_mitra where deleted_at is null and id_mitra>0";

		$data = $this->db->query($sql);

		return $data->row()->jml;
		
		}
		
		public function total_user() {
	   
    		$sql = "SELECT  COUNT(*) as jml FROM t_user_mobile where deleted_at is null";
    
    		$data = $this->db->query($sql);
    
    		return $data->row()->jml;
		
		}
		
	
		
		 
		 public function dataharian(){
		     $queryowner=getqueryowner();
		     $sql = "SELECT coalesce(sum(grand_total),0) as total,count(1) as jum
		     FROM t_transaction o join t_mitra m on o.id_mitra=m.id_mitra where DATE(tgl_trans)=curdate() 
			 and status_transaksi='finish' and status_bayar='paid' $queryowner";
    
    		$data = $this->db->query($sql);
    
    		return $data->row();
		    
		 }
		 
		 public function databulanan(){
		     $queryowner=getqueryowner();
		     $sql = "SELECT coalesce(sum(grand_total),0) as total,count(1) as jum
		     FROM t_transaction o join t_mitra m on o.id_mitra=m.id_mitra where (month(tgl_trans)=month(curdate()) and year(tgl_trans)=year(curdate())) 
			 and status_transaksi='finish' and status_bayar='paid' $queryowner";
    
    		$data = $this->db->query($sql);
    
    		return $data->row();
		    
		 }
		 
		 public function dataharianmanual(){
		     $queryowner=getqueryowner();
		     $sql = "SELECT COALESCE((SUM(`stop_value`-`start_value`) * d.harga_perkwh *  0.001),0) AS total,COUNT(1) AS jum
		     FROM `t_transaction_manual` l JOIN (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			 ON l.chargebox_id=p.chargebox_id 
			 JOIN `t_connector_detail` d ON l.chargebox_id=d.chargebox_id AND l.connector_id=d.connector_id
			 WHERE DATE(l.`start_timestamp`)=CURDATE() 
			 AND l.status='stop' GROUP BY  DATE(l.`start_timestamp`)";
    
    		$data = $this->db->query($sql);
             
			 
			 if ($data->num_rows() > 0)
            return $data->row();
				else {
					$data->total=0;
					$data->jum=0;
					return $data;
				}
					
					}
		 
		  public function databulananmanual(){
		     $queryowner=getqueryowner();
		     $sql = "SELECT COALESCE((SUM(`stop_value`-`start_value`) * d.harga_perkwh *  0.001),0) AS total,COUNT(1) AS jum
		     FROM `t_transaction_manual` l JOIN (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			 ON l.chargebox_id=p.chargebox_id
			 JOIN `t_connector_detail` d ON l.chargebox_id=d.chargebox_id AND l.connector_id=d.connector_id
			 WHERE MONTH(l.`start_timestamp`)=MONTH(CURDATE()) and Year(l.`start_timestamp`)=Year(CURDATE())
			 AND l.status='stop' GROUP BY MONTH(l.`start_timestamp`),Year(l.`start_timestamp`)";
    
    		$data = $this->db->query($sql);
			if ($data->num_rows() > 0)
    		return $data->row();
		
		else {
			$data->total=0;
					$data->jum=0;
					return $data;
		}
		    
		 }
		 
		 
		 public function grafiktotaltransaksibulanan(){
		     $queryowner=getqueryowner();
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT DATE_FORMAT(tgl_trans, '%Y-%m') AS month_key, MONTH(tgl_trans) AS month, sum(grand_total) AS total FROM 
            t_transaction o join t_mitra p ON o.id_mitra=p.id_mitra where tgl_trans >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01') and status_transaksi='finish' and status_bayar='paid' $queryowner group by DATE_FORMAT(tgl_trans, '%Y-%m'), MONTH(tgl_trans) ORDER BY DATE_FORMAT(tgl_trans, '%Y-%m')";
            $query = $this->db->query($sql);
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		  public function grafikjumlahtransaksibulanan(){
		      $queryowner=getqueryowner();
		     
		     $sql="SELECT DATE_FORMAT(tgl_trans, '%Y-%m') AS month_key, MONTH(tgl_trans) AS month, count(1) AS total FROM 
            t_transaction o join t_mitra p ON o.id_mitra=p.id_mitra
			where tgl_trans >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01') and status_transaksi='finish' and status_bayar='paid' $queryowner group by DATE_FORMAT(tgl_trans, '%Y-%m'), MONTH(tgl_trans) ORDER BY DATE_FORMAT(tgl_trans, '%Y-%m')";
            $query = $this->db->query($sql);
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		  public function grafiktransaksiharian(){
		      $queryowner=getqueryowner();
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT DAY(tgl_trans) AS tanggal, SUM(grand_total) AS total FROM 
            t_transaction o join t_mitra p ON o.id_mitra=p.id_mitra  where month(tgl_trans)=month(curdate()) and year(tgl_trans)=year(now()) 
			and status_bayar='paid' $queryowner GROUP BY DAY(tgl_trans) ORDER BY DAY(tgl_trans) ";
            $query = $this->db->query($sql);
            
            
            if ($query->num_rows() > 0)
            return $query->result();
			else return [];

		 }
		 
		  public function jumcharging(){
		      $queryowner=getqueryowner();
		     	$sql = "SELECT COUNT(*) as jml FROM t_transaction o join  t_mitra p ON o.id_mitra=p.id_mitra $queryowner
				
				where o.`status_transaksi`=? and date(tgl_trans)=curdate()";
    
    		$data = $this->db->query($sql,["charging"]);
    
    		return $data->row()->jml;
		    
		 }
		 
		  public function grafiktotaltransaksibulananmanual(){
		     $queryowner=getqueryowner();
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT DATE_FORMAT(`start_timestamp`, '%Y-%m') AS month_key, MONTH(`start_timestamp`) AS `month`, COALESCE(SUM((`stop_value`-`start_value`) * d.harga_perkwh * 0.001),0) AS total FROM 
            `t_transaction_manual` l JOIN  (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			 ON l.chargebox_id=p.chargebox_id 
			 JOIN `t_connector_detail` d ON l.chargebox_id=d.chargebox_id AND l.connector_id=d.connector_id 
			  WHERE start_timestamp >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01') AND l.STATUS='stop' GROUP BY DATE_FORMAT(start_timestamp, '%Y-%m'), MONTH(start_timestamp) ORDER BY DATE_FORMAT(start_timestamp, '%Y-%m')";
            $query = $this->db->query($sql);
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		
		 
		  public function grafikjumlahtransaksibulananmanual(){
		      $queryowner=getqueryowner();
		     
		     $sql="SELECT DATE_FORMAT(`start_timestamp`, '%Y-%m') AS month_key, MONTH(`start_timestamp`) AS `month`, COUNT(1) AS total FROM 
            `t_transaction_manual` l JOIN (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			 ON l.chargebox_id=p.chargebox_id
			WHERE start_timestamp >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01') AND l.status='stop' GROUP BY DATE_FORMAT(start_timestamp, '%Y-%m'), MONTH(start_timestamp) ORDER BY DATE_FORMAT(start_timestamp, '%Y-%m')";
            $query = $this->db->query($sql);
            $hasil = [];
            
            
            return $query->result();

		 }
		 
		 
		 
		 
		 public function grafiktransaksiharianmanual(){
		      $queryowner=getqueryowner();
		     // $this->db->query("SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));");
		     $sql="SELECT DAY(`start_timestamp`) AS tanggal, COALESCE((SUM(`stop_value`-`start_value`)  * d.`harga_perkwh` *  0.001),0) AS total FROM 
            t_transaction_manual l JOIN 
            
            (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			 ON l.chargebox_id=p.chargebox_id AND l.connector_id=l.connector_id
			 JOIN `t_connector_detail` d ON l.chargebox_id=d.chargebox_id AND l.connector_id=d.connector_id 
			 
			 WHERE MONTH(start_timestamp)=MONTH(CURDATE()) AND YEAR(start_timestamp)=YEAR(NOW()) 
			AND l.status='stop'   GROUP BY DATE(start_timestamp) ORDER BY DATE(start_timestamp)";
            $query = $this->db->query($sql);
            
            
            if ($query->num_rows() > 0)
            return $query->result();
		else return [];

		 }
		
		 
		  public function jumchargingmanual(){
		      $queryowner=getqueryowner();
		     	$sql = "SELECT COUNT(*) AS jml FROM t_transaction_manual l JOIN 
				(SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

) p
			ON l.chargebox_id=p.chargebox_id AND l.connector_id=l.connector_id
		   where l.`status`=?";
    
    		$data = $this->db->query($sql,["charging"]);
    
    		return $data->row()->jml;
		    
		 }
		 
		
	
}

