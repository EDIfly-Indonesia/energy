<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Pengguna extends AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
	date_default_timezone_set('Asia/Jakarta');
	 date_default_timezone_set('Asia/Jakarta');
	$config = Array(
            'protocol' => 'smtp',
            'smtp_host' => 'ssl://bandungtech.my.id',
            'smtp_port' => 465,
            'smtp_user' => 'admin@dianterin.id',
            'smtp_pass' => 'K2%v)IsWWO5F',
            'mailtype' => 'html',
            'charset' => 'iso-8859-1'
        );

        $this->load->library('email', $config);
    }
	public function index()
	{
			$data = array(
		  'title' => "Data Satuan"
			);
   
		 $this->load->view('produk/unit.php', $data);
		 
	}
	
	
	public function getdatarole(){
			
        $idjenis=$_POST['jenis'];
		if($idjenis==3 || $idjenis==4 || $idjenis==5 ){
		$sql="select id_mitra as id, name
		from t_mitra where deleted_at is null and id_mitra>0 order by name";
		}
		else
			$sql="select id_marketing as id,nama as name
		from marketing where status=1 order by nama";

		$query= $this->db->query($sql);
		
        echo json_encode($query->result());	
    }
	
		public function getdatamitra(){
			
        $idjenis=$_POST['jenis'];
		if($idjenis==3){
		$sql="select owner_id as id,owner_name as name
		from owner where owner_status=1 and owner_id>0 order by owner_name";
		}
		

		$query= $this->db->query($sql);
		
        echo json_encode($query->result());	
    }
	
	public function ubahhakakses($id)
	{
		check_access(12,$this->session->type_id);
		$this->data['title']="Data pengguna";
		$this->db->where('id',$id);
        $type = $this->db->get('t_user_type')->row_object();
        if(!$type){
            $this->session->set_flashdata('danger',nofound());
            redirect(base_url($this->data['access']->code));
        }
        $this->db->query("create temporary table user_access_temp(select * from t_user_access where user_type_id=$id)");
        $sql = "select a.*,b.id user_access_id,b.c,b.u,b.d,b.a from t_access a left join user_access_temp b on a.id=b.access_id";
        $access = $this->db->query($sql." where a.parent is null order by sort")->result();
        foreach($access as $i => $a){
            $access[$i]->child = $this->db->query($sql." where a.parent=".$a->id." order by sort")->result();
        }
        
		
		$data['userdata'] = $this->userdata;
		
		$data['page'] = "ubahhakakses";
		$data['type'] = $type;
		$data['user_access'] = $access;
		$data['judul'] = "Data Role";
		$data['deskripsi'] = "Manage Data Role";
		$data['access'] = true;
			$this->template->views('pengguna/ubahhakakses.php', $data);
	}
	
	public function simpanubahhakakses(){
		 $data = $this->input->post();
        $this->db->where('id',$data['data']['id']);
        $this->db->update('t_user_type',$data['data']);
        $error = $this->db->error();
        if($error['message']){
            $this->session->set_flashdata('danger',$error['message']);
            redirect(base_url($this->data['access']->code)."/type_edit/".$data['data']['id']);
        }
        $this->db->where('user_type_id',$data['data']['id']);
        $this->db->delete('t_user_access');
        foreach($data['access'] as $a){
            $a['user_type_id'] = $data['data']['id'];
            $this->db->insert('t_user_access',$a);
        }
        $this->session->set_flashdata('success',updated());
        redirect(base_url('pengguna/datarole'));
	}
	
	public function tambahhakakses(){
		// check_access(32,$this->session->type_id);
		$access = $this->db->query("select * from t_access where parent is null order by sort")->result();
        foreach($access as $i => $d){
            $access[$i]->child = $this->db->query("select * from t_access where parent = ".$d->id." order by sort")->result();
        }
      
		$data['userdata'] = $this->userdata;
		
		$data['page'] = "tambahhakakses";
		$data['user_access'] = $access;
		$data['judul'] = "Data Role";
		$data['deskripsi'] = "Manage Data Role";
		$data['access'] = true;
	    $this->template->views('pengguna/tambahhakakses',$data);
		
		
		
		
        
	}
	
	public function simpanhakakses(){
		 $data = $this->input->post();
      
        $this->db->insert('t_user_type',$data['data']);
		$idbaru = $this->db->insert_id();
        $error = $this->db->error();
        if($error['message']){
            $this->session->set_flashdata('danger',$error['message']);
            redirect(base_url($this->data['access']->code)."/type_edit/".$data['data']['id']);
        }
       
        foreach($data['access'] as $a){
            $a['user_type_id'] = $idbaru ;
            $this->db->insert('t_user_access',$a);
        }
        $this->session->set_flashdata('success',updated());
        redirect(base_url('pengguna/datarole'));
	}
	public function datapengguna()
	{
		check_access(13,$this->session->type_id);
		$data['userdata'] = $this->userdata;
		
		$data['access']=$this->data['access'];

		$data['page'] = "datapengguna";
		$data['judul'] = "Data Pengguna";
		$data['deskripsi'] = "Manage Data Pengguna";
	    $this->template->views('pengguna/datapengguna.php', $data);
	}
	
	public function datarole()
	{
		$data['userdata'] = $this->userdata;
		
		

		$data['page'] = "datarole";
		
		$data['judul'] = "Data Role";
		$data['deskripsi'] = "Manage Data Role";
		$data['access'] = true;
	    $this->template->views('pengguna/datarole.php', $data);
	}
	
	
	public function datapenggunajson()
	{
		check_access(13,$this->session->type_id);
		$akses=$this->data['access'];
		$whereData = " where u.id>0";
		
		
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				u.name LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "select u.id,u.code,u.name,u.email,a.code as hakakses, a.id idhakakses,u.id_role,
			(case when verified=1 then 'aktif' else 'belum aktif' end) as status
			from t_users_admin u join t_user_type a  on u.type_id=a.id
			
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['code'] = $r['code'];
                $nestedData['name'] = $r['name'];
				$nestedData['email'] =  $r['email'];
				$nestedData['hakakses'] =  $r['hakakses'];
                $nestedData['status'] =  $r['status'];
				$ubah =$akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubahpengguna( \''. $r['name'].'\','.$r['id'].',\''.$r['code'].'\',\''.$r['email'].'\','.$r['idhakakses'].','.$r['id_role'].');"><i class="fa fa-edit"></i></a>':"";
				//$show ='<a href="'. base_url("pemasukan/detailpemasukan/".$r['id']."").' "title="Lihat" class="btn btn-sm btn-info">Lihat</a>';
                $nestedData['aksi']=$ubah;
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
	
	public function datahakaksesjson()
	{
		//check_access(41,$this->session->type_id);
		//$akses=$this->data['access'];
		$whereData = " where u.id>0";
		
		
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				u.code LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "select u.id,u.code
			from t_user_type u
			
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['code'] = $r['code'];
               $nestedData['id'] = $r['id'];
			   $id=$r['id'];
				//$ubah =$akses->u ? '<a href="'. base_url("pengguna/ubahhakakses/$id").' "title="Ubah" class="btn btn-sm btn-warning"><i class="fa fa-edit"></i></a>':"";
				$ubah = '<a href="'. base_url("pengguna/ubahhakakses/$id").' "title="Ubah" class="btn btn-sm btn-warning"><i class="fa fa-edit"></i></a>';
				//$show ='<a href="'. base_url("pemasukan/detailpemasukan/".$r['id']."").' "title="Lihat" class="btn btn-sm btn-info">Lihat</a>';
                $nestedData['aksi']=$ubah;
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
	
	public function gethakakses(){
		$data = $this->db->get('t_user_type')->result();
		echo json_encode($data);
	}
	
	
	public function simpanpengguna(){
		$status="gagal";
	
		 $datasimpan = array(
                 'code'     => $_POST['code'],
				 'name'     => $_POST['nama'],
				 'email'     => $_POST['email'],
				 'password'     =>md5( $_POST['password']),
				 'type_id'     => $_POST['type_id'],
				  'foto'     => 'profil2.jpg',
				 'id_role'     => $_POST['role'],
				 'verified'     => 1,
				 'verification'     =>md5(time()),
                 );
        
      $simpan = $this->db->insert('t_users_admin', $datasimpan);
		if($simpan) {
		    	$status="sukses";
		   $this->kirimpassword($_POST['email'],$_POST['password'],"Password oCharge admin dashboard",'pass',$_POST['code']);
		
		}
		
	
		
		echo  $status;
      
    }
	
	public function simpanubahpengguna(){
		$status="gagal";
	
		 $datasimpan = array(
                
				 'name'     => $_POST['nama'],
				 'email'     => $_POST['email'],
				'type_id'     => $_POST['type_id'],
			    'id_role'     => $_POST['role'],
				 );
                 
                 
                 
         $this->db->where('id', $_POST['id']);
      $simpan=$this->db->update("users_admin", $datasimpan);
		if($simpan) $status="sukses";
		
		echo  $status;
      
    }
	
	public function simpanahsp(){
		$status="gagal";
	
		 $datasimpan = array(
                'id_product'     => $_POST['id_produk'],
				'id_detail'     => $_POST['id_detail'],
				 'price_detail'     => $_POST['harga'],
				  'jumlah'     => $_POST['jumlah'],
				  'last_update'  =>date("Y-m-d H:i:s")
                 );
        
      $simpan = $this->db->insert('product_detail', $datasimpan);
		if($simpan) $status="sukses";
		
		echo  $status;
      
    }
	
	public function simpanahspbaru(){
		$status="gagal";
		$idproduk=$_POST['id_produk'];
		$namaproduk=$_POST['nama_produk'];
		$keteranganproduk=$_POST['keterangan_produk'];
		$satuanproduk=$_POST['satuan_produk'];
		$hargaproduk=$_POST['harga_produk'];
		
		if($idproduk==0){
		$datasimpanproduk = array(
                'name'     => $namaproduk,
                
                'description'       =>  $keteranganproduk,
                'unit_id'           => $satuanproduk,
                'price'           => $hargaproduk,
				 'type'           =>4,
            );
        
      
      	$simpan = $this->db->insert('product', $datasimpanproduk);
		$idproduk=$this->db->insert_id();
		}
		
		
		
		
		
		$datasimpan = array(
                'id_product'     => $idproduk,
				'id_detail'     => $_POST['id_detail'],
				 'price_detail'     => $_POST['harga'],
				  'jumlah'     => $_POST['jumlah'],
				  'last_update'  =>date("Y-m-d H:i:s")
                 );
        
      $simpan = $this->db->insert('product_detail', $datasimpan);
		if($simpan) $status="sukses";
		
		echo  $idproduk;
      
    }
	
	public function ubahsatuan(){
		$status="gagal";
	
		$datasimpan = array(
                'code'     => $_POST['nama_satuan'],
                
            );
        
            $this->db->where('id', $_POST['id_satuan']);
			$simpan=$this->db->update("product_unit", $datasimpan);
	    if($simpan) $status="sukses";
		echo  $status;
      
    }
	
	public function ubahdatadetail(){
		$status="gagal";
	
		$datasimpan = array(
                'price_detail'     => $_POST['harga'],
				 'jumlah'     => $_POST['jumlah'],
                
            );
        
            $this->db->where('id', $_POST['id_detail']);
			$simpan=$this->db->update("product_detail", $datasimpan);
	    if($simpan) $status="sukses";
		echo  $status;
      
    }
	
	public function ubahdatasumber(){
		$status="gagal";
	
		$datasimpan = array(
                'name'     => $_POST['txtnama'],
                'code'          =>  $_POST['txtkode'],
                'description'       =>  $_POST['txtket'],
                'unit_id'           => $_POST['txtsatuan'],
                'price'           => $_POST['txtharga'],
				 'persen_up'           => $_POST['txtpersen'],
				
            );
        
            $this->db->where('id', $_POST['idsumber']);
			$simpan=$this->db->update("product", $datasimpan);
	    if($simpan) $status="sukses";
		echo  $status;
      
    }
	
	
	
	
	public function tambah(){
		$this->data['title'] = "Tambah Klien";
		$this->data['type'] = $this->db->get('person_type')->result();
		$this->db->where('parent',0);
		$this->data['location'] = $this->db->get('location')->result();
		$this->load->view('person/new',$this->data);
	}
	
	
    
    function kirimpassword($email,$password,$judul,$jenis,$user){
		
			$subject = $judul;
			$headers  = 'MIME-Version: 1.0' . "\r\n";
			$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
			$headers .= "From: admin@ailapos.com";
			$ket=$jenis=="pass"? "User Password Admin" :"Kode OTP";

			$pesan="
						<html><head>
			<style>
			td{
				border-collapse: collapse;
					border-spacing: 0;
					font-family: 'Arial',sans-serif;
					color: #555;
					line-height: 1.5;
					border-bottom-color: #cccccc;
					border-bottom-width: 1px;
					border-bottom-style: solid;
					margin: 0;
					padding: 5px 10px;
				}
				.flex{padding:0px; color:#444; width:100%}
				@media only screen and (min-width: 500px) 
				{
					.flex{padding:0px; color:#444; width:70%}
				}
			</style>
			</head><body style='color:#444; padding:10px;font-size:14px'>
			<div style='border:solid 1px #ddd; padding:0px'>
			<div style='width:100%' align='center'>
				<div class='flex' align='left' >
					
					<h2 align='center' style='color:#444'>$ket OCharge.</h2>
					<div style='color:#444'>
					Berdasarkan data yang kami terima,$ket <b>OCharge</b> sebagai berikut:<br>
					</div>
					<table border=0 widht='100%' style='margin-top:20px; width:100%' cellspacing='10' >
					   
						
					  
				   
					<p aling='center' style='padding:15px;background:rgb(240, 240, 240);'>
						<a style='font-family: \"Arial\",sans-serif;
								color: #000000!important;
								line-height: 1.5;
								text-decoration: none!important;
								display: block;
								clear: both;
								width: 50%;
								text-align: center;
							   
								font-size: 18px;
								margin: 0 auto;
								padding: 10px 0;' href='#' target='_BLANK'> User:  $user</a><br>
								<a style='font-family: \"Arial\",sans-serif;
								color: #000000!important;
								line-height: 1.5;
								text-decoration: none!important;
								display: block;
								clear: both;
								width: 50%;
								text-align: center;
							   
								font-size: 18px;
								margin: 0 auto;
								padding: 10px 0;' href='#' target='_BLANK'> Password:  $password</a>
					</p>
					<p>Silahkan login di https://ocharge.tritus.my.id dengan data di atas.</p>
					<p style='font-family:\"Arial\",sans-serif;color:#999;line-height:1.5;margin:0;padding:10px; font-size:12px; background:rgb(240, 240, 240);'>
						Segala bentuk informasi seperti
						<b>
						nomor kontak, alamat e-mail, atau password kamu bersifat rahasia.
						</b>
						Jangan menginformasikan data-data tersebut kepada siapa pun, termasuk kepada pihak yang mengatasnamakan AilaPOS.
					</p>
					
					<hr style='border:2px solid #ed1b2f'>
					<div align='center' style='color:#444'>Harap jangan membalas e-mail ini, karena e-mail ini dikirimkan secara otomatis oleh sistem.</div>
				</div>
				
			</div>

			</div>
			</body></html>";


		//mail($email,$judul, $pesan, $headers);
		//mail($email,$judul, $pesan, $headers);
    $kirim=$this->kirim_email_api($judul,$email,$pesan);
    //$kirim=$this->kirim_email_api("Kode Verifikasi",$email,$pesan);
	return $kirim;
	 //$kirim=$this->kirimemailsmtp($email,$judul,$pesan);
	}
	
	function kirimemailsmtp($emailtujuan,$judul,$isipesan) {
       
       $this->email->set_newline("\r\n");

            
                    $this->email->from('admin@ailapos.com', 'Admin AilaPOS');
                    $this->email->to($emailtujuan);
                    $this->email->subject($judul);
                    $this->email->message($isipesan);
            		$this->email->send();
		
    }
	
	function kirim_email_api($mail_title,$mail_to,$pesan)
	{
		$curl = curl_init();

			curl_setopt_array($curl, array(
			  CURLOPT_URL => 'https://api.sendinblue.com/v3/smtp/email',
			  CURLOPT_RETURNTRANSFER => true,
			  CURLOPT_ENCODING => '',
			  CURLOPT_MAXREDIRS => 10,
			  CURLOPT_TIMEOUT => 0,
			  CURLOPT_FOLLOWLOCATION => true,
			  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			  CURLOPT_CUSTOMREQUEST => 'POST',
			  CURLOPT_POSTFIELDS =>'{  
			   "sender":{  
				  "name":"Admin Ocharge",
				  "email":"admin@ailapos.com"
			   },
			   "to":[  
				  {  
					 "email":"'.$mail_to.'",
					 "name":"John Doe"
				  }
			   ],
			   "subject":"'.$mail_title.'",
			   "htmlContent":'.json_encode($pesan).'
			}',
			  CURLOPT_HTTPHEADER => array(
				'api-key: '.getenv('SENDINBLUE_API_KEY'),
				'Content-Type: application/json'
			  ),
			));

			$response = curl_exec($curl);

			curl_close($curl);
			return $response;
	}
	
}
