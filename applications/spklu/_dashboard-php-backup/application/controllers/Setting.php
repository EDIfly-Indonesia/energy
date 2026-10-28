<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Setting extends  AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
		$this->load->model('M_master');
	
    }
	public function index()
	{	
			$data = array(
		  'title' => "Modules &rsaquo; Datatables"
			);
   
		 $this->load->view('pelanggan/index.php', $data);
	}

	public function ppn()
	{
			
		check_access(47,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "[ppn]";
		$data['judul'] = "Nilai PPN";
		$data['deskripsi'] = "";
		$data['nilaippn'] = $this->M_master->ppn();
		$this->template->views('setting/ppn',  $data);
		
	}

	public function pbjt()
	{
			
		check_access(48,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "pbjt";
		$data['judul'] = "Nilai PBJT";
		$data['deskripsi'] = "";
		$data['nilaippn'] = $this->M_master->ppn();
		$data['nilaipbjt'] = $this->M_master->pbjt();
		$this->template->views('setting/pbjt',  $data);
		
	}
	
	public function adminwallet()
	{
			
		check_access(48,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "pbjt";
		$data['judul'] = "Nilai PBJT";
		$data['deskripsi'] = "";
		$data['adminwallet'] = $this->M_master->adminwallet();
		$data['adminwalletsandbox'] = $this->M_master->adminwallet("admin_wallet_sandbox");
		$this->template->views('setting/adminwallet',  $data);
		
	}
	
	
	
	
	public function hapus(){
		$status="gagal";
	      
		    $this->db->where('customer_id', $_POST['id']);
			$simpan=$this->db->delete("customers");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	




	public function simpanppn(){
		$status="gagal";
	
		   $datasimpan = array(
				'value_setting' => $_POST['ppn'],
	       );
        
		$this->db->where('nama_setting', 'ppn');
		$simpan=$this->db->update("t_setting", $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }

	public function simpanpbjt(){
		$status="gagal";
	
		   $datasimpan = array(
				'value_setting' => $_POST['pbjt'],
				);
        
		$this->db->where('nama_setting', 'pbjt');
		$simpan=$this->db->update("t_setting", $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanadminwallet(){
		$status="gagal";
	
		   $datasimpan = array(
				'value_setting' => $_POST['prod'],
				);
        
		$this->db->where('nama_setting', 'admin_wallet');
		$simpan=$this->db->update("t_setting", $datasimpan);
		
		$datasimpan = array(
				'value_setting' => $_POST['sandbox'],
				);
        
		$this->db->where('nama_setting', 'admin_wallet_sandbox');
		$simpan=$this->db->update("t_setting", $datasimpan);
	
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanusermobile(){
		$status="gagal";
	
		   $datasimpan = array(
				'name' => $_POST['name'],
				'cell' => $_POST['cell'],
				'email' 	=>  $_POST['email'],
				'password' 	=>  md5($_POST['password']),
				'user_type' 	=> $_POST['user_type'],
				'status' => $_POST['status'],
				'shop_id' => $_POST['shop_id'],
				'owner_id' =>  getidrole(),
                 );
        
		$simpan = $this->db->insert('users', $datasimpan);
	$simpan = true;
		if($simpan) {
			 
		 
		 $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubah(){
		$status="gagal";
		
		   $datasimpan = array(
				'name' => $_POST['nama'],
				'cell' 	=> $_POST['telp'],
				'user_type' 	=> $_POST['tipe'],
				'status' 	=> $_POST['status'],
						
                 );
        
		$this->db->where('id', $_POST['id']);
		$simpan=$this->db->update("users", $datasimpan);
		
		if($simpan) {
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	
	
	
	
	
}
