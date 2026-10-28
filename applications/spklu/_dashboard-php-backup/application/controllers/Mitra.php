<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Mitra extends  AUTH_Controller {

	
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
	
	
	public function datamitra()
	{
			
		check_access(5,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "mitra";
		$data['judul'] = "Data Mitra";
		$data['deskripsi'] = "Manage Data Mitra";
		
		$this->template->views('mitra/datamitra',  $data);
		
	}
	
	
	
	public function datamitrajson()
	{
		
		
		$whereData = " where p.deleted_at is null and p.id_mitra>0";
		check_access(5,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				p.name LIKE '%".$post['search']['value']."%'  or p.email LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "select id_mitra as id,name,email,no_hp as telp from t_mitra p 
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
              	$nestedData['name'] = $r['name'];
				$nestedData['email'] =  $r['email'];
				$nestedData['telp'] =  $r['telp'];
				
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
	
	public function simpandata(){
		$status="gagal";
		 
		
        
		   $datasimpan = array(
				'name' => $_POST['name'],
				'email' => $_POST['email'],
				'no_hp' => $_POST['no_hp'],
				
                 );
              
		       $simpan = $this->db->insert('t_mitra', $datasimpan);;
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubah(){
		$status="gagal";
		
		   $datasimpan = array(
				'name' => $_POST['name'],
				'email' 	=> $_POST['email'],
				'no_hp' 	=> $_POST['no_hp'],
				);
        
		$this->db->where('id_mitra', $_POST['id']);
		$simpan=$this->db->update("t_mitra", $datasimpan);
		
		if($simpan) {
		
		
		$status="sukses";
		}
		echo  $status;
      
    }
    
	
	
	
	
	
}
