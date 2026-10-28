<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Beban extends  AUTH_Controller {

	
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
	
	
	public function databeban()
	{
			
		check_access(34,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "databeban";
		$data['judul'] = "Data beban";
		$data['deskripsi'] = "";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('beban/databeban',  $data);
		
	}
	
	public function getdatabeban(){
		    $id=$_POST['id'];
			$sql="select id,no_akun,nama_akun,status
			from akun where id=?";
			$query= $this->db->query($sql,[$id]);
		    echo json_encode($query->row());
	}
	
	public function databebanjson()
	{
		//$whereData = " where u.status_publish=1 and(u.disetujui=1 or u.last_id_approval is null) and u.isspk=0";
		
		check_access(34,$this->session->type_id);
		$shopid=$_POST['shop_id'];
	
		
	
		
		$querytoko=$shopid==0 ? "" :" and (o.shop_id=$shopid or o.shop_id=0)";
		$akses=$this->data['access'];
		$post = $this->input->post();
		$queryowner="and (o.owner_id=".getidrole() ." or o.owner_id=0)";  //WHERE (shop_id=? or shop_id=0) AND jns2='Beban' and ispengeluaran=1
		$whereData = " where o.id>0 $queryowner $querytoko AND jns2='Beban' and ispengeluaran=1 ";
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				s.shop_name LIKE '%".$post['search']['value']."%' or o.nama_akun LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "SELECT id,no_akun,nama_akun,shop_name as namatoko FROM akun o left join shop s on o.shop_id=s.shop_id
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
              
				
				$nestedData['no_akun'] =  $r['no_akun'];
				$nestedData['nama_akun'] =  $r['nama_akun'];
			    $nestedData['namatoko'] = $r['namatoko'];
                
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
				$hapus =$akses->d ?'<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id'].');"><i class="fa fa-trash"></i></a>' :"";
               
				$nestedData['aksi']= is_null($r['namatoko'])? "": $ubah ." ".$hapus ;
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
	
    public function simpanbeban(){
		$status="gagal";
			$datasimpan = array(
				'no_akun' => $_POST['nomor_akun'],
				'nama_akun' => $_POST['nama_beban'],
				'jns' => 1,
				'jns2' => 'Beban',
				'ktr' => 'tambahan',
				'shop_id' => $_POST['shop_id'],
				'status' 	=>  $_POST['status'],
				'ispengeluaran' => 1,
				'owner_id' 	=>  getidrole(),
			
                 );
              
		       $simpan = $this->db->insert('akun', $datasimpan);
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }
    
    public function hapusbeban(){
		$status="gagal";

	      
	       $this->db->where('id', $_POST['id']);
			$simpan=$this->db->delete("akun");
		   
		if($simpan) $status="sukses";
			echo  $status;
      
    }
    
    public function simpanubahbeban(){
		$status="gagal";
		
		   $datasimpan = array(
				'no_akun' => $_POST['nomor_akun'],
				'nama_akun' => $_POST['nama_beban'],
				'status' 	=>  $_POST['status'],
				
					
                 );
        
		$this->db->where('id', $_POST['id']);
		$simpan=$this->db->update("akun", $datasimpan);
		
		if($simpan) {
		
		
		$status="sukses";
		}
		echo  $status;
      
    }

	
}
