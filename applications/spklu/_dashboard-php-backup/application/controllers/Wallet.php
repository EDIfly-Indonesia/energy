<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Wallet extends  AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
	
	
    }
	public function index()
	{	
			$data = array(
		  'title' => "Modules &rsaquo; Datatables"
			);
   
		 $this->load->view('pelanggan/index.php', $data);
	}
	
	
	public function datarefund()
	{
			
		check_access(5,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "refund";
		$data['judul'] = "Data Refund";
		$data['deskripsi'] = "Manage Data Mitra";
		
		$this->template->views('wallet/datarefund',  $data);
		
	}
	
	public function datatopup()
	{
			
		check_access(58,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "topup";
		$data['judul'] = "Data Topup";
		$data['deskripsi'] = "Manage Data Topup";
		
		$this->template->views('wallet/datatopup',  $data);
		
	}
	
	
	
	public function datarefundjson()
	{
		
		
		$whereData = " where r.id > 0";
		check_access(56,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				u.nama LIKE '%".$post['search']['value']."%'  or r.no_trans LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "select r.id,r.no_trans,r.jml_transaksi,jumlah as jml_refund,status,tgl_buat,tgl_done, u.nama,email,no_hp 
			from t_refund r join t_user_mobile u on r.id_user=u. id_user
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
              	$nestedData['no_trans'] = $r['no_trans'];
				$nestedData['email'] =  $r['email'];
				$nestedData['no_hp'] =  $r['no_hp'];
				$nestedData['nama'] =  $r['nama'];
				$nestedData['jml_transaksi'] =  number_format($r['jml_transaksi']);
				$nestedData['jml_refund'] = number_format($r['jml_refund']);
				$nestedData['status'] =  $r['status'];
				$nestedData['tgl_done'] =  ketwaktu($r['tgl_done']);
				$nestedData['tgl_buat'] =  ketwaktu($r['tgl_buat']);
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah Status" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
                
				$nestedData['aksi']=$r['status']=="pending" ?  $ubah : ""  ;
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
	
	public function datatopupjson()
	{
		
		
		$whereData = " where r.id_topup > 0";
		check_access(58,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				u.nama LIKE '%".$post['search']['value']."%'  or r.no_trans LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "select r.id_topup as id,r.no_trans,r.jumlah as jml_topup,tgl_topup,tgl_expired,status_topup, u.nama,email,no_hp 
			from t_topup r join t_user_mobile u on r.id_user=u. id_user
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
              	$nestedData['no_trans'] = $r['no_trans'];
				$nestedData['email'] =  $r['email'];
				$nestedData['no_hp'] =  $r['no_hp'];
				$nestedData['nama'] =  $r['nama'];
				$nestedData['jml_topup'] =  number_format($r['jml_topup']);
				
				$nestedData['status_topup'] =  $r['status_topup'];
				$nestedData['tgl_expired'] =  ketwaktu($r['tgl_expired']);
				$nestedData['tgl_topup'] =  ketwaktu($r['tgl_topup']);
				
				
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
	
	public function hapus(){
		$status="gagal";
	      
		  $datasimpan = array(
				'deleted_at' => date("Y-m-d H:i:s"),
				//'deleted_by_pk' => $this->session->id_user
				
					
                 );
        
		$this->db->where('id_mitra', $_POST['id']);
		$simpan=$this->db->update("t_mitra", $datasimpan);
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	
	
	public function getdataubah(){
		$id=$_POST['id'];
			$sql="select * from t_mitra where id_mitra=?";
			$query= $this->db->query($sql,[$id]);
		    echo json_encode($query->row());
	}
	
	
	
	public function ubahstatus(){
		$status="gagal";
		
		   $datasimpan = array(
				'status' => 'done',
				'tgl_done' => date("Y-m-d H:i:s"),
				
				);
        
		$this->db->where('id', $_POST['id']);
		$simpan=$this->db->update("t_refund", $datasimpan);
		
		if($simpan) {
		
		
		$status="sukses";
		}
		echo  $status;
      
    }
    
	
	
	
	
	
}
