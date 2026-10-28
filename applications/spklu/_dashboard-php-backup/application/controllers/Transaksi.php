<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Transaksi extends  AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
		$this->load->model('M_mitra');
		$this->load->model('M_master');
	   
    }
	public function index()
	{	
			$data = array(
		  'title' => "Modules &rsaquo; Datatables"
			);
   
		 $this->load->view('pelanggan/index.php', $data);
	}
	
	
	
	public function datatransaksi()
	{
			
		check_access(10,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
		$data['datatenant'] = $this->M_master->data_mitra();
		$data['datauser'] = $this->M_master->data_user();
		$data['datachargebox'] = $this->M_master->data_chargebox();
		$data['page'] = "transaksi";
		
		$data['judul'] = "Data Transaksi";
		$data['deskripsi'] = "Data Transaksi";
		
		
		$this->template->views('transaksi/datatransaksi',  $data);
		
	}
	
	public function datamanual()
	{
			
		check_access(51,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
		$data['datatenant'] = $this->M_master->data_mitra();
		$data['datachargebox'] = $this->M_master->data_chargebox();
		$data['page'] = "transaksi";
		
		$data['judul'] = "Data Transaksi Manual";
		$data['deskripsi'] = "Data Transaksi Manual";
		
		
		$this->template->views('transaksi/datamanual',  $data);
		
	}
		
	public function laporanpengeluaran()
	{
			
		check_access(24,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
	    $data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['page'] = "laporanpengeluaran";
		
		$data['judul'] = "Laporan Pengeluaran";
		$data['deskripsi'] = "Laporan Pengeluaran";
		
		
		$this->template->views('transaksi/laporanpengeluaran',  $data);
		
	}
	
		public function laporantransaksi()
	{
			
		check_access(26,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
	    $data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['page'] = "laporanpengeluaran";
		
		$data['judul'] = "Laporan Transaksi";
		$data['deskripsi'] = "";
		
		
		$this->template->views('transaksi/laporantransaksi',  $data);
		
	}
	
	
	
	
	public function datatransaksijson()
	{
	
		$queryowner=getqueryowner();
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$tenant=$_POST['tenant'];
		$user=$_POST['user'];
		$status=$_POST['status'];
		$chargebox=$_POST['chargebox'];
		
		$querychargebox=$chargebox=='semua'? "" :" and o.chargebox_id='$chargebox'";
		$querystatus=$status=='semua'? "" :" and o.status_transaksi='$status'";
		$querytenant=$tenant=='semua'? "" :" and o.id_mitra=$tenant";
		$queryuser=$user=='semua'? "" :" and o.id_user=$user";
		$querywaktu=$jeniswaktu==1 ? " and month(o.tgl_trans)='$bulan' and year(o.tgl_trans)='$tahun'" :" and (date(o.tgl_trans)>='$tanggal1' and date(o.tgl_trans)<='$tanggal2')";
		$whereData = " where o.no_trans!='' $queryowner $querytenant $querywaktu $querystatus $querychargebox $queryuser";
		check_access(10,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.no_trans LIKE '%".$post['search']['value']."%'  or o.chargebox_id LIKE '%".$post['search']['value']."%'   or m.name LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_total_emisi = "SELECT COALESCE(SUM(o.`jml_kwh_terpakai`)/1000,0) AS total_kwh,
			COALESCE((SUM(o.`jml_kwh_terpakai`)/1000) * 0.85,0) AS total_emisi
			FROM `t_transaction` o JOIN t_mitra m ON o.`id_mitra`=m.`id_mitra`
			JOIN `t_transaction_detail` d ON o.`no_trans`=d.`no_trans`
			 ".$whereData;
			$query_total_emisi = $this->db->query($sql_total_emisi)->row();

			$sql_filtered  = "SELECT o.id,o.tgl_trans,o.no_trans,o.status_transaksi ,o.tgl_bayar,o.chargebox_id,o.connector_id,m.name AS mitra,
			o.tipe_charging,FORMAT(o.`jml_kwh_order`/1000,0) jml_kwh_order,FORMAT(`jml_kwh_terpakai`/1000,3) terpakai,
			FORMAT(o.biaya_lain,0) biaya_lain,FORMAT((o.grand_total-o.biaya_lain),0) total,
			FORMAT(o.grand_total,0) grand_total,
			d.`start_timestamp` start_timestamp, 
			d.stop_timestamp stop_timestamp,
			d.stop_reason,FORMAT(ttl_refund,0) ttl_refund,status_refund
			FROM `t_transaction` o JOIN t_mitra m ON o.`id_mitra`=m.`id_mitra`
			JOIN `t_transaction_detail` d ON o.`no_trans`=d.`no_trans`
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['tgl_trans'] =  $this->ketwaktu($r['tgl_trans']);
				$nestedData['mitra'] = $r['mitra'];
				$nestedData['chargebox_id'] = $r['chargebox_id'];
				$nestedData['connector_id'] = $r['connector_id'];
              	$nestedData['no_trans'] = $r['no_trans'];
				$nestedData['grand_total'] =  $r['grand_total'];
				$nestedData['total'] = $r['total'];
				$nestedData['ttl_refund'] = $r['ttl_refund'];
				$nestedData['status_refund'] = $r['status_refund'];
				$nestedData['biaya_lain'] =  $r['biaya_lain'];
				$nestedData['tgl_bayar'] = is_null($r['tgl_bayar'])? "": $this->ketwaktu($r['tgl_bayar']);
				
				$nestedData['terpakai'] = $r['terpakai'];
				$nestedData['tipe_charging'] = $r['tipe_charging'];
				$nestedData['jml_kwh_order'] = $r['jml_kwh_order'];
				
				$nestedData['start_timestamp'] = is_null($r['start_timestamp']) ? "" : $this->ketwaktu($r['start_timestamp']);
				$nestedData['stop_timestamp'] =is_null($r['stop_timestamp']) ? "" : $this->ketwaktu($r['stop_timestamp']);;
				$nestedData['stop_reason'] = $r['stop_reason'];
				$nestedData['status_transaksi'] = $r['status_transaksi'];
				
				$data[] = $nestedData;
                $no++;
            }
			 }
			 else $data=[];
			$datanya= array(
					'draw' => $post["draw"],
					'recordsTotal' =>  $query->num_rows(),
					'recordsFiltered' => $query_filtered->num_rows(),
					'total_kwh_terpakai' => number_format($query_total_emisi->total_kwh, 2),
					'total_emisi_karbon' => number_format($query_total_emisi->total_emisi, 2),
					'data' => $data
				);
		
			echo json_encode($datanya);
		}else{
			echo json_encode(array());
		}
		
	}
	
	public function manualtransaksijson()
	{
	
		
		check_access(51,$this->session->type_id);
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$mitra=$_POST['mitra'];
		$queryowner=getqueryowner();
		$chargebox=$_POST['chargebox'];
		
		$querychargebox=$chargebox=='semua'? "" :" and t.chargebox_id='$chargebox'";
		
		$querymitra=$mitra=='semua'? "" :" and o.id_mitra=$mitra";
		$querywaktu=$jeniswaktu==1 ? " and month(t.start_timestamp)='$bulan' and year(t.start_timestamp)='$tahun'" :" and (date(t.start_timestamp)>='$tanggal1' and date(t.start_timestamp)<='$tanggal2')";
		
		
		$akses=$this->data['access'];
		$queryowner=getqueryowner();
		$whereData = " where t.trans_id!=''  $querywaktu  $querychargebox ";
		$post = $this->input->post();
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				t.trans_id LIKE '%".$post['search']['value']."%' or  t.chargebox_id LIKE '%".$post['search']['value']."%')";
			}
			$whereData .=" GROUP BY t.trans_id, t.chargebox_id, t.connector_id, n.mitra, t.start_timestamp, t.stop_timestamp, t.start_value, t.stop_value";
			$sql_filtered  = "SELECT `trans_id` AS id,t.`chargebox_id`,t.`connector_id` ,mitra,`start_timestamp`,`stop_timestamp`,
			Format(((`stop_value`-`start_value`)/1000),3) penggunaan FROM `t_transaction_manual` t 

JOIN (SELECT c.chargebox_id,c.id_mitra,o.name AS mitra FROM `t_chargebox` c JOIN  t_mitra o  ON o.id_mitra =c.id_mitra
$queryowner

)  n ON t.`chargebox_id`=n.`chargebox_id`
			
			 "
			 .$whereData
			 ;
			 
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				
                $nestedData['mitra'] = $r['mitra'];
				$nestedData['chargebox_id'] = $r['chargebox_id'];
				$nestedData['connector_id'] = $r['connector_id'];
				
				
				$nestedData['penggunaan'] = $r['penggunaan'];
				$nestedData['start_timestamp'] = is_null($r['start_timestamp']) ? "" : $this->ketwaktu($r['start_timestamp']);  
				$nestedData['stop_timestamp'] = is_null($r['stop_timestamp']) ? "" : $this->ketwaktu($r['stop_timestamp']); 
              
				
				$data[] = $nestedData;
                $no++;
            }
			 }
			 else $data=[];
			$datanya= array(
					'draw' => $post["draw"],
					'recordsTotal' =>  $query->num_rows(),
					'recordsFiltered' => $query_filtered->num_rows(),
					'data' => $data
				);
		
			echo json_encode($datanya);
		}else{
			echo json_encode(array());
		}
	}
	
	
	function ketstatus($status){
		switch ($status){
			case "p"; $s="prepayment";break;
			case "r"; $s="ready";break;
			case "h"; $s="charging";break;
			case "o"; $s="checkout";break;
			case "c"; $s="cancelled";break;
			case "x"; $s="expired";break;
			
		}
		return $s;
	}
	
	function ketwaktu($date){
			   $param_date=date('d-m-Y',strtotime($date));
			   $response  = $param_date;
			   if($param_date==date('d-m-Y',strtotime("now"))){
				   $response = 'Today, '. date('H:i:s',strtotime($date));
			   }else if($param_date==date('d-m-Y',strtotime("-1 days"))){
				   $response = 'Yesterday, ' . date('H:i:s',strtotime($date)); 
			   }
			   else $response= date("d-M-Y H:i", strtotime($date))  ;
			   return $response;
			}
	
	
	
	public function laporantransaksijson()
	{
	
		
		check_access(26,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$querytoko=$shopid==0 ? "" :" and s.shop_id=$shopid";
		
		$querywaktu=$jeniswaktu==1 ? " and month(order_date)='$bulan' and year(order_date)='$tahun'" :" and (date(order_date)>='$tanggal1' and date(order_date)<='$tanggal2')";
		
		$akses=$this->data['access'];
		$queryowner=getqueryowner();
		$whereData = " where o.order_id>0 $queryowner $querytoko $querywaktu";
		$post = $this->input->post();
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				shop_name LIKE '%".$post['search']['value']."%' )";
			}
			$sql_filtered  = "select o.order_id as id,o.invoice_id as no_faktur, s.shop_name as nama_toko,order_date as tanggal,order_time as jam,order_price as total,o.customer_name as pelanggan,
			cash as bayar
			from order_list o join shop s on o.shop_id=s.shop_id
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['total'] =  number_format($r['total'],0);
				$nestedData['bayar'] =  number_format($r['bayar'],0);
				$nestedData['no_faktur'] = $r['no_faktur'];
                $nestedData['nama_toko'] = $r['nama_toko'];
				$nestedData['pelanggan'] = $r['pelanggan'];
				$nestedData['tanggal'] =date('d F Y ', strtotime($r['tanggal'])) .$r['jam'] ;
			
				
			
				$data[] = $nestedData;
                $no++;
            }
			 }
			 else $data=[];
			$datanya= array(
					'draw' => $post["draw"],
					'recordsTotal' =>  $query->num_rows(),
					'recordsFiltered' => $query_filtered->num_rows(),
					'data' => $data
				);
		
			echo json_encode($datanya);
		}else{
			echo json_encode(array());
		}
	}
	
	
	
		public function detailtransaksi($id)
	{
		check_access(10,$this->session->type_id);
		
		
		$data['access'] = $this->data['access'];
		
		$data['userdata'] = $this->userdata;
			$data['page'] = "detailtransaksi";
			$data['id'] =$id;
		
		$data['judul'] = "Detail Transaksi";
		$data['deskripsi'] = "Detail Transaksi";
		
		
		
			$this->template->views('transaksi/detailtransaksi',  $data);
	}
	
	public function simpanpengeluaran(){
		$status="gagal";
			$datasimpan = array(
				'expense_name' => $_POST['nama'],
				'expense_note' => $_POST['catatan'],
				'expense_amount' => $_POST['jumlah'],
				'expense_date' => $_POST['tanggal'],
				'expense_time' => $_POST['jam'],
				'shop_id' => $_POST['toko'],
				'owner_id' 	=>  getidrole(),
				'no_akun' 	=> $_POST['beban'],
                 );
              
		       $simpan = $this->db->insert('expense', $datasimpan);
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }
	
	public function hapus(){
		$status="gagal";
	      
		    $this->db->where('id', $_POST['id_transaksi']);
			$simpan=$this->db->delete("transaksi");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function hapuspengeluaran(){
		$status="gagal";
	      
		    $this->db->where('expense_id', $_POST['id']);
			$simpan=$this->db->delete("expense");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function simpanubahstatus(){
		$status="gagal";
		 $datasimpan = array(
				'status' 	=> 'o',
				);
		
	      
	  $this->db->where('transaction_order_number', $_POST['id']);
       $simpan=$this->db->update("transaction_order", $datasimpan);
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	
	public function getdatapelanggan(){
			$this->db->where('id', $_POST['id_pelanggan']);
			$data = $this->db->get('pelanggan')->row();
		    echo json_encode($data);
	}
	
		public function databeban(){
		   $shopid= $_POST['shop_id'];
		 $sql = "SELECT * FROM akun  WHERE (shop_id='$shopid' or shop_id=0) AND jns2='Beban' and ispengeluaran=1 ORDER BY urut";
		 $query = $this->db->query($sql);
		    echo json_encode($query->result());
	    }
	
	public function getalamat($idpelanggan){
			$this->db->where('id', $idpelanggan);
			$data = $this->db->get('pelanggan')->row()->id_alamat;
		    return $data;
	}
	

	
	public function getdetail($id)
	{
	
		$whereData = " where invoice_id='$id'";
		
		
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				nama_brg LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "select product_id as kode_brg,product_name as nama_brg,product_quantity as jml_brg,product_price as harga_brg,(product_quantity*product_price) as total
		from order_details
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['kode_brg'] = $r['kode_brg'];
                $nestedData['nama_brg'] = $r['nama_brg'];
				$nestedData['jml_brg'] =  $r['jml_brg'];
			    $nestedData['harga_brg'] = number_format($r['harga_brg'],0); 
			    $nestedData['total']=number_format($r['total'],0);
				$data[] = $nestedData;
                $no++;
            }
			 }
			 else $data=[];
			$datanya= array(
					'draw' => $post["draw"],
					'recordsTotal' =>  $query->num_rows(),
					'recordsFiltered' => $query_filtered->num_rows(),
					'data' => $data
				);
		
			echo json_encode($datanya);
		}else{
			echo json_encode(array());
		}
	}
	
	
}
