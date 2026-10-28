<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Member extends  AUTH_Controller {

	
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
	
	
	public function datajenismember()
	{
			
		check_access(52
		,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "member";
		$data['judul'] = "Data Jenis Member";
		$data['deskripsi'] = "Manage Jenis Member";
		if($this->session->type_id==1)	$data['daftarmitra'] =  $this->M_master->data_mitra();
		$this->template->views('member/datajenismember',  $data);
		
	}
	
	public function databiaya()
	{
			
		check_access(53
		,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "macambiaya";
		$data['judul'] = "Data Macam  Biaya";
		$data['deskripsi'] = "Manage Macam Biaya";
		if($this->session->type_id==1)	$data['daftarmitra'] =  $this->M_master->data_mitra();
		$this->template->views('member/databiaya',  $data);
		
	}
	public function biayamember($id)
	{
			
		check_access(54
		,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "biayamember";
		$data['judul'] = "Data Biaya  Member";
		$data['deskripsi'] = "Manage Biaya Member";
		$data['daftarbiaya'] =  $this->M_master->data_biaya();
		$data['daftarchargebox'] =  $this->M_master->data_chargebox();
		$data['id'] =$id;
		$this->template->views('member/biayamember',  $data);
		
	}
	
	public function datamember()
	{
			
		check_access(55
		,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "datamember";
		$data['judul'] = "Data Member";
		$data['deskripsi'] = "Manage Data Member";
		$data['daftarjenismember'] =  $this->M_master->data_jenismember();
		
		$this->template->views('member/datamember',  $data);
		
	}
	
	public function datamemberjson()
	{
		$queryowner=getqueryowner();
		
		$whereData = " where o.id_mitra!='' $queryowner " ;
		check_access(55,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.nama_member LIKE '%".$post['search']['value']."%' or o.email_member LIKE '%".$post['search']['value']."%'
				)";
			}
			
			$sql_filtered  = "SELECT id_member as id,o.nama_member,email_member,no_hp ,j.nama_member jenis_member,`biaya_perkwh`,`biaya_perjam`
				FROM `t_member` o JOIN t_jenismember j ON o.`id_jenismember`=j.`id_jenismember` 
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
              	$nestedData['nama_member'] = $r['nama_member'];
				$nestedData['email_member'] = $r['email_member'];
				$nestedData['no_hp'] =  $r['no_hp'];
				$nestedData['jenis_member'] =  $r['jenis_member'];
				$nestedData['biaya_perkwh'] =  number_format($r['biaya_perkwh'],0);
				$nestedData['biaya_perjam'] =  number_format($r['biaya_perjam'],0);
				
				
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
	
	
	public function datajson()
	{
		$queryowner=getqueryowner();
		
		$whereData = " where o.id_mitra!=-1 $queryowner or o.id_mitra=0" ;
		check_access(52,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.nama_member LIKE '%".$post['search']['value']."%' or t.name LIKE '%".$post['search']['value']."%'
				)";
			}
			//$whereData .=" GROUP by o.charge_box_id";
			$sql_filtered  = "SELECT o.`id_jenismember` AS id,nama_member,t.name AS mitra,`biaya_perjam`,`biaya_perkwh`
				FROM `t_jenismember` o JOIN t_mitra t ON o.`id_mitra`=t.`id_mitra` 
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
              	$nestedData['nama_member'] = $r['nama_member'];
				$nestedData['mitra'] =  $r['mitra'];
				$nestedData['biaya_perjam'] =  number_format($r['biaya_perjam'],0);
				$nestedData['biaya_perkwh'] =  number_format($r['biaya_perkwh'],0);
				
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
                $hapus =$akses->d ?'<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id'].');"><i class="fa fa-trash"></i></a>' :"";
				$member= base64_encode($r['id']);
				$harga =$akses->u ? '<a href="'. base_url("member/biayamember/".$member."").' "title="Lihat" class="btn btn-sm btn-info"><i class="fa fa-money"></i></a>' :"";
				$nestedData['aksi']=$ubah." ".$hapus." ".$harga;
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
	
	public function databiayajson()
	{
		$queryowner=getqueryowner();
		
		$whereData = " where o.id_mitra>-1 $queryowner " ;
		check_access(53,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.nama_biaya LIKE '%".$post['search']['value']."%' or o.in_english LIKE '%".$post['search']['value']."%' or t.name LIKE '%".$post['search']['value']."%'
				)";
			}
			//$whereData .=" GROUP by o.charge_box_id";
			$sql_filtered  = "SELECT id_biaya as id,nama_biaya ,t.name AS mitra,default_biaya,jenis_biaya
				FROM `t_biaya` o JOIN t_mitra t ON o.`id_mitra`=t.`id_mitra` 
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
              	$nestedData['nama_biaya'] = $r['nama_biaya'];
				$nestedData['mitra'] =  $r['mitra'];
				$nestedData['jenis_biaya'] =  $r['jenis_biaya'];
				$nestedData['default_biaya'] =  number_format($r['default_biaya'],0);
				
				
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
	
	public function biayamemberjson($id)
	{
		$queryowner=getqueryowner();
	
		$whereData = " where j.id_jenismember='$id'  $queryowner";
		check_access(54,$this->session->type_id);
		$akses=$this->data['access'];
		
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				nama_biaya LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "SELECT o.id,j.nama_member,b.nama_biaya,b.jenis_biaya,o.besar_biaya ,o.chargebox_id,o.connector_id
				FROM `t_besar_biaya` o JOIN t_biaya b ON b.`id_biaya`=o.`id_biaya`
				JOIN`t_jenismember` j ON j.`id_jenismember`=o.`id_jenismember`
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['nama_member'] = $r['nama_member'];
                $nestedData['nama_biaya'] = $r['nama_biaya'];
				$nestedData['jenis_biaya'] =  $r['jenis_biaya'];
				$nestedData['chargebox_id'] = $r['chargebox_id'];
				$nestedData['connector_id'] = $r['connector_id'];
			    $nestedData['besar_biaya'] = number_format($r['besar_biaya'],0); 
			    $nestedData['id'] = $r['id'];
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
			$this->db->where('id_jenismember', $_POST['id']);
			$simpan=$this->db->delete("t_jenismember");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function hapusbiaya(){
		$status="gagal";
			$this->db->where('id_biaya', $_POST['id']);
			$simpan=$this->db->delete("t_biaya");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	
	public function hapusbiayamember(){
		$status="gagal";
			$this->db->where('id', $_POST['id']);
			$simpan=$this->db->delete("t_besar_biaya");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function hapusmember(){
		$status="gagal";
			$this->db->where('id_member', $_POST['id']);
			$simpan=$this->db->delete("t_member");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	public function getdatapelangganawal(){
			$this->db->where('id', $_POST['id_pelanggan']);
			$data = $this->db->get('pelanggan')->row();
		    echo json_encode($data);
	}
	
	public function getdataubah(){
		$id=$_POST['id'];
			$sql="select *
			from t_jenismember where id_jenismember=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	
	public function getdatamember(){
		$id=$_POST['id'];
			$sql="select *
			from t_member where id_member=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	public function getdatabiayaubah(){
		$id=$_POST['id'];
			$sql="select *
			from t_biaya where id_biaya=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	public function getbesarbiayaubah(){
		$id=$_POST['id'];
			$sql="select *
			from t_besar_biaya where id=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	public function simpandata(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_member' => $_POST['nama_member'],
				'id_mitra' => $tipe==1 ?  $_POST['mitra'] : $idrole,
				'biaya_perkwh' 	=>  $_POST['biaya_perkwh'],
				'biaya_perjam' 	=>  $_POST['biaya_perjam'],
	    );
        
		$simpan = $this->db->insert('t_jenismember`', $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanmember(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_member' => $_POST['nama_member'],
				'id_mitra' => $idrole,
				'email_member' 	=>  $_POST['email_member'],
				'no_hp' 	=>  $_POST['no_hp'],
				'id_jenismember' 	=>  $_POST['id_jenismember'],
	    );
        
		$simpan = $this->db->insert('t_member`', $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpandatabiaya(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_biaya' => $_POST['nama_biaya'],
				'jenis_biaya' => $_POST['jenis_biaya'],
				'id_mitra' => $tipe==1 ?  $_POST['mitra'] : $idrole,
				
				'default_biaya' 	=>  $_POST['default_biaya'],
	    );
        
		$simpan = $this->db->insert('t_biaya`', $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanbiayamember(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'id_biaya' => $_POST['id_biaya'],
				'besar_biaya' => $_POST['besar_biaya'],
				'id_mitra' =>  $idrole,
				'id_jenismember' 	=>  $_POST['id_jenismember'],
				'chargebox_id' => $_POST['chargebox_id'],
				'connector_id' => $_POST['connector_id'],
				
	    );
        
		$simpan = $this->db->insert('t_besar_biaya', $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanbesarbiayaubah(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'id_biaya' => $_POST['id_biaya'],
				'besar_biaya' => $_POST['besar_biaya'],
				'id_mitra' =>  $idrole,
				'id_jenismember' 	=>  $_POST['id_jenismember'],
				'chargebox_id' => $_POST['chargebox_id'],
				'connector_id' => $_POST['connector_id'],
						
                 );
        
		$this->db->where('id', $_POST['id']);
		$simpan=$this->db->update("t_besar_biaya", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanbiayaubah(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_biaya' => $_POST['nama_biaya'],
				'jenis_biaya' => $_POST['jenis_biaya'],
				'tenant_pk' => $tipe==1 ?  $_POST['tenant'] : $idrole,
				'in_english' 	=>  $_POST['in_english'],
				'default_biaya' 	=>  $_POST['default_biaya'],
						
                 );
        
		$this->db->where('id_biaya', $_POST['id']);
		$simpan=$this->db->update("t_biaya", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubah(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_member' => $_POST['nama_member'],
				'id_mitra' =>  $tipe==1 ?  $_POST['mitra'] : $idrole,
				'biaya_perkwh' 	=>  $_POST['biaya_perkwh'],
				'biaya_perjam' 	=>  $_POST['biaya_perjam'],
						
                 );
        
		$this->db->where('id_jenismember', $_POST['id']);
		$simpan=$this->db->update("t_jenismember", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanmemberubah(){
		$status="gagal";
		$tipe=$this->session->type_id;
		$idrole=$this->session->id_role;
		   $datasimpan = array(
				'nama_member' => $_POST['nama_member'],
				
				'email_member' 	=>  $_POST['email_member'],
				'no_hp' 	=>  $_POST['no_hp'],
				'id_jenismember' 	=>  $_POST['id_jenismember'],
						
                 );
        
		$this->db->where('id_member', $_POST['id']);
		$simpan=$this->db->update("t_member", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	
	
	
}
