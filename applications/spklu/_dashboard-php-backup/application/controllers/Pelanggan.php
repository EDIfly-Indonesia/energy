<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Pelanggan extends  AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
		$this->load->model('M_mitra');
	
    }
	public function index()
	{	
			$data = array(
		  'title' => "Modules &rsaquo; Datatables"
			);
   
		 $this->load->view('pelanggan/index.php', $data);
	}
	
	
	public function datapelanggan()
	{
			
		check_access(20
		,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "pelanggan";
		$data['judul'] = "Data Pelanggan";
		$data['deskripsi'] = "Manage Data Pelanggan";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('pelanggan/datapelanggan',  $data);
		
	}
	
	
	
	public function datapelangganjson()
	{
		//$whereData = " where u.status_publish=1 and(u.disetujui=1 or u.last_id_approval is null) and u.isspk=0";
		
		check_access(20,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
		$akses=$this->data['access'];
		$post = $this->input->post();
		$queryowner=getqueryowner();
		$whereData = " where o.customer_id>0 $queryowner $querytoko";
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				customer_name LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "select o.customer_id id,o.customer_name as nama,o.customer_cell no_hp,o.customer_email email,o.customer_address as alamat,
			(case when o.status=1 then 'Aktif' else 'NonAktif' end) status,s.shop_name as namatoko
			from customers o join shop s on o.shop_id=s.shop_id
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
              
				$nestedData['nama'] =  $r['nama'];
				$nestedData['alamat'] =  $r['alamat'];
				$nestedData['namatoko'] =  $r['namatoko'];
				$nestedData['status'] = $r['status'];
				$nestedData['email'] = $r['email'];
                $nestedData['no_hp'] = $r['no_hp'];
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
                $hapus =$akses->d ?'<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id'].');"><i class="fa fa-trash"></i></a>' :"";
				$nestedData['aksi']=$ubah." ".$hapus;
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
	      
		    $this->db->where('customer_id', $_POST['id']);
			$simpan=$this->db->delete("customers");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function getdatapelangganawal(){
			$this->db->where('id', $_POST['id_pelanggan']);
			$data = $this->db->get('pelanggan')->row();
		    echo json_encode($data);
	}
	
	public function getdatapelanggan(){
		$id=$_POST['id_pelanggan'];
			$sql="select *
			from customers where customer_id=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	public function simpanpelanggan(){
		$status="gagal";
		
		   $datasimpan = array(
				'customer_name' => $_POST['nama'],
				'customer_cell' => $_POST['no_hp'],
				'customer_email' 	=>  $_POST['email'],
				'customer_address' 	=>  $_POST['alamat'],
				'status' 	=> $_POST['status'],
				'shop_id' => $_POST['toko'],
				'owner_id' =>  getidrole(),
                 );
        
		$simpan = $this->db->insert('customers', $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubah(){
		$status="gagal";
		
		   $datasimpan = array(
				'customer_name' => $_POST['nama_pelanggan'],
				'customer_address' 	=> $_POST['alamat'],
				'shop_id' 	=>  $_POST['toko'],
				'customer_email' 	=> $_POST['email'],
				'customer_cell' => $_POST['no_hp'],
				'status' 	=> $_POST['status'],
						
                 );
        
		$this->db->where('customer_id', $_POST['id']);
		$simpan=$this->db->update("customers", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	
	
	
	
	
}
