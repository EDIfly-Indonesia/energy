<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Chargebox extends  AUTH_Controller {

	
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

	public function simpan()
{
    $this->output->set_content_type('application/json');

    // Ambil data dari POST
    $chargebox_id   = $this->input->post('chargebox_id');
    $nama_chargebox = $this->input->post('nama_chargebox');
    $id_mitra       = $this->input->post('id_mitra');
    $id_area        = $this->input->post('id_area');
    $vendor         = $this->input->post('vendor');
    $model          = $this->input->post('model');
    $serial_number  = $this->input->post('serial_number');
    $ocpp_protocol  = $this->input->post('ocpp_protocol');
    $jenis          = $this->input->post('jenis');
    $lat            = $this->input->post('lat');
    $lng            = $this->input->post('lng');
    $is_ppn         = $this->input->post('is_ppn');
    $is_public      = $this->input->post('is_public');
    $is_active      = $this->input->post('is_active');
    $created_at     = date('Y-m-d H:i:s');

    // Validasi ocpp_protocol
    $valid_ocpp_protocols = ['non_ocpp', 'ocpp1.6J', 'ocpp2.0', 'ocpp2.0.1'];
    if (!in_array($ocpp_protocol, $valid_ocpp_protocols)) {
        echo json_encode(['status' => 'error', 'message' => 'OCPP Protocol tidak valid!']);
        return;
    }

    // Validasi jenis
    $valid_jenis = ['car', 'bike'];
    if (!in_array($jenis, $valid_jenis)) {
        echo json_encode(['status' => 'error', 'message' => "Jenis tidak valid! Harus 'car' atau 'bike'."]);
        return;
    }

     // Ambil data fasilitas dan langsung decode JSON ke array
    $fasilitas = $this->input->post('fasilitas');
    $fasilitas_array = json_decode($fasilitas, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['status' => 'error', 'message' => 'Data fasilitas tidak valid!']);
        return;
    }

	
    // Proses foto dan judul yang dikirim dalam format JSON
    $foto_judul = json_decode($this->input->post('foto_judul'), true);
    $foto_names = [];

    if (!empty($_FILES['foto']['name'][0])) {
        $upload_path = './uploads/chargebox/';
        $this->load->library('upload');

        // Upload setiap foto
        foreach ($_FILES['foto']['name'] as $key => $val) {
            $_FILES['file']['name']     = $_FILES['foto']['name'][$key];
            $_FILES['file']['type']     = $_FILES['foto']['type'][$key];
            $_FILES['file']['tmp_name'] = $_FILES['foto']['tmp_name'][$key];
            $_FILES['file']['error']    = $_FILES['foto']['error'][$key];
            $_FILES['file']['size']     = $_FILES['foto']['size'][$key];

            $this->upload->initialize([
                'upload_path'   => $upload_path,
                'allowed_types' => 'jpg|jpeg|png|gif',
                'max_size'      => 2048,
            ]);

            if ($this->upload->do_upload('file')) {
                $upload_data = $this->upload->data();
                $foto_names[] = $upload_data['file_name'];
            } else {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Gagal mengupload foto: ' . strip_tags($this->upload->display_errors())
                ]);
                return;
            }
        }
    }

    // Menyesuaikan format foto dan judul
    $foto_data = [];
    foreach ($foto_judul as $index => $foto) {
        $foto_data[] = [
            'foto'  => $foto_names[$index] ?? '',
            'judul' => $foto['judul']
        ];
    }

    $foto_json = json_encode($foto_data);

    // Simpan data ke database
    $data = array(
        'chargebox_id'     => $chargebox_id,
        'nama_chargebox'   => $nama_chargebox,
        'id_mitra'         => $id_mitra,
        'id_area'          => $id_area,
        'vendor'           => $vendor,
        'model'            => $model,
        'serial_number'    => $serial_number,
        'ocpp_protocol'    => $ocpp_protocol,
        'jenis'            => $jenis,
        'lat'              => $lat,
        'lng'              => $lng,
        'is_ppn'           => $is_ppn,
        'is_public'        => $is_public,
        'is_active'        => $is_active,
        'created_at'       => $created_at,
		'fasilitas'        => $fasilitas_array,
        'foto'             => $foto_json, // Menyimpan foto dalam format JSON
    );

    // Insert data ke database
    $insert = $this->db->insert('t_chargebox', $data);

    if ($insert) {
        $response = $data;
		$response['fasilitas'] = $fasilitas_array; // decode lagi agar response rapi
        $response['foto'] = $foto_data; // Menyertakan data foto yang terupload
        $response['status'] = 'success';
        $response['message'] = 'Berhasil disimpan!';
		echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        $error_message = $this->db->error();
        log_message('error', 'Insert Error: ' . print_r($error_message, true));
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal menyimpan data: ' . $error_message['message']
        ]);
    }
}
	public function get_area()
{
    $areas = $this->db->get('t_area')->result();

    $response = [];

    foreach ($areas as $area) {
        $response[] = [
            'id' => $area->id_area,             // untuk value option
            'text' => $area->nama_area,         // untuk ditampilkan
            'nama_area' => $area->nama_area     // tambahan: biar bisa ditampilkan di input text
        ];
    }

    echo json_encode($response);
}

public function get_mitra()
{
    $mitra = $this->db->get('t_mitra')->result();  // Ambil data mitra dari database
    
    $response = [];

    foreach ($mitra as $item) {
        $response[] = [
            'id' => $item->id_mitra,   // sesuai dengan nama kolom di DB
            'text' => $item->name      // sesuai dengan nama kolom di DB
        ];
    }

    echo json_encode($response);  // Kembalikan dalam format JSON
}
	
	public function area()
	{
		check_access(60,$this->session->type_id);

		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "dataarea";
		$data['judul'] = "Data Area";
		$data['deskripsi'] = "Manage Data Area";
		$this->template->views('chargebox/dataarea', $data);
	}

	public function dataareajson()
	{
		check_access(60,$this->session->type_id);
		$akses = $this->data['access'];
		$post = $this->input->post();

		if (empty($post)) {
			echo json_encode(array());
			return;
		}

		$whereData = " WHERE 1=1 ";
		if (!empty($post['search']['value'])) {
			$search = $this->db->escape_like_str($post['search']['value']);
			$whereData .= " AND (
				nama_area LIKE '%".$search."%' ESCAPE '!' OR
				alamat LIKE '%".$search."%' ESCAPE '!' OR
				kode_pos LIKE '%".$search."%' ESCAPE '!' OR
				kota LIKE '%".$search."%' ESCAPE '!'
			)";
		}

		$sql_total = "SELECT COUNT(*) AS jml FROM t_area";
		$query_total = $this->db->query($sql_total);

		$sql_filtered = "SELECT id_area,nama_area,alamat,kode_pos,kota,foto,last_update FROM t_area ".$whereData;
		$query_filtered = $this->db->query($sql_filtered);

		$orderColumn = isset($post['columns'][$post["order"][0]["column"]]['data']) ? $post['columns'][$post["order"][0]["column"]]['data'] : 'nama_area';
		$allowedOrder = array('nama_area','alamat','kode_pos','kota','last_update','id_area');
		if (!in_array($orderColumn, $allowedOrder)) $orderColumn = 'nama_area';
		$orderDir = (isset($post["order"][0]["dir"]) && strtolower($post["order"][0]["dir"]) == 'desc') ? 'DESC' : 'ASC';
		$start = isset($post['start']) ? intval($post['start']) : 0;
		$length = isset($post['length']) ? intval($post['length']) : 10;

		$sql = $sql_filtered." ORDER BY ".$orderColumn." ".$orderDir." LIMIT ".$start.",".$length;
		$query = $this->db->query($sql);

		$data = array();
		if ($query->num_rows() > 0) {
			foreach ($query->result_array() as $r) {
				$nestedData = array();
				$nestedData['id_area'] = $r['id_area'];
				$nestedData['nama_area'] = $r['nama_area'];
				$nestedData['alamat'] = $r['alamat'];
				$nestedData['kode_pos'] = $r['kode_pos'];
				$nestedData['kota'] = $r['kota'];
				$nestedData['last_update'] = !empty($r['last_update']) ? date("d-M-Y H:i:s", strtotime($r['last_update'])) : "";
				$nestedData['foto'] = !empty($r['foto']) ? '<img src="'.base_url('uploads/area/'.$r['foto']).'" class="img-thumbnail" style="width:70px;height:50px;object-fit:cover;">' : '-';

				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id_area'].');"><i class="fa fa-edit"></i></a>' : "";
				$hapus = $akses->d ? '<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id_area'].');"><i class="fa fa-trash"></i></a>' : "";
				$nestedData['aksi'] = $ubah." ".$hapus;
				$data[] = $nestedData;
			}
		}

		$datanya = array(
			'draw' => intval($post["draw"]),
			'recordsTotal' => (int) $query_total->row()->jml,
			'recordsFiltered' => $query_filtered->num_rows(),
			'data' => $data
		);

		echo json_encode($datanya);
	}

	private function uploadFotoArea($fieldName)
	{
		if (empty($_FILES[$fieldName]['name'])) {
			return "";
		}

		$upload_path = './uploads/area/';
		if (!is_dir($upload_path)) {
			mkdir($upload_path, 0755, true);
		}

		$this->load->library('upload');
		$this->upload->initialize(array(
			'upload_path' => $upload_path,
			'allowed_types' => 'jpg|jpeg|png|gif',
			'max_size' => 2048,
			'encrypt_name' => TRUE
		));

		if (!$this->upload->do_upload($fieldName)) {
			echo json_encode(array('status' => 'error', 'message' => strip_tags($this->upload->display_errors())));
			exit;
		}

		$upload_data = $this->upload->data();
		return $upload_data['file_name'];
	}

	public function simpandataarea()
	{
		check_access(60,$this->session->type_id);
		$this->output->set_content_type('application/json');

		$nama_area = trim($this->input->post('nama_area'));
		if ($nama_area == "") {
			echo json_encode(array('status' => 'error', 'message' => 'Nama area harus diisi!'));
			return;
		}

		$data = array(
			'nama_area' => $nama_area,
			'alamat' => $this->input->post('alamat'),
			'kode_pos' => $this->input->post('kode_pos'),
			'kota' => $this->input->post('kota')
		);

		$foto = $this->uploadFotoArea('foto');
		if ($foto != "") {
			$data['foto'] = $foto;
		}

		$simpan = $this->db->insert('t_area', $data);
		echo json_encode(array('status' => $simpan ? 'success' : 'error', 'message' => $simpan ? 'Berhasil disimpan!' : 'Gagal menyimpan data!'));
	}

	public function getdataarea()
	{
		check_access(60,$this->session->type_id);
		$id = $this->input->post('id_area');
		$this->db->where('id_area', $id);
		$data = $this->db->get('t_area')->row();
		echo json_encode($data);
	}

	public function simpanubaharea()
	{
		check_access(60,$this->session->type_id);
		$this->output->set_content_type('application/json');

		$id_area = $this->input->post('id_area');
		$nama_area = trim($this->input->post('nama_area'));
		if ($id_area == "" || $nama_area == "") {
			echo json_encode(array('status' => 'error', 'message' => 'Nama area harus diisi!'));
			return;
		}

		$data = array(
			'nama_area' => $nama_area,
			'alamat' => $this->input->post('alamat'),
			'kode_pos' => $this->input->post('kode_pos'),
			'kota' => $this->input->post('kota')
		);

		$foto = $this->uploadFotoArea('foto');
		if ($foto != "") {
			$data['foto'] = $foto;
		}

		$this->db->where('id_area', $id_area);
		$simpan = $this->db->update('t_area', $data);
		echo json_encode(array('status' => $simpan ? 'success' : 'error', 'message' => $simpan ? 'Berhasil diubah!' : 'Gagal mengubah data!'));
	}

	public function hapusArea()
	{
		check_access(60,$this->session->type_id);
		$this->output->set_content_type('application/json');

		$id_area = $this->input->post('id_area');
		$this->db->where('id_area', $id_area);
		$simpan = $this->db->delete('t_area');
		echo json_encode(array('status' => $simpan ? 'success' : 'error', 'message' => $simpan ? 'Berhasil dihapus!' : 'Gagal menghapus data!'));
	}

	public function datachargebox()
	{
			
		check_access(46,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "chargebox";
		$data['judul'] = "Data ChargeBox";
		$data['deskripsi'] = "Manage Data ChargeBox";
		$data['nilaippn'] = $this->M_master->ppn();
		$data['daftararea'] = $this->db->order_by('nama_area', 'ASC')->get('t_area')->result();
		$data['daftarmitra'] =  $this->M_master->data_mitra();
		$this->template->views('chargebox/datachargebox',  $data);
		
	}
	
	public function detailconnector($id)
	{
		check_access(46,$this->session->type_id);
		
		
		$data['access'] = $this->data['access'];
		
		$data['userdata'] = $this->userdata;
			$data['page'] = "detailconnector";
			$data['id'] =$id;
		
		$data['judul'] = "Detail Konektor";
		$data['deskripsi'] = "Detail Konektor";
		
		
		
			$this->template->views('chargebox/detail',  $data);
	}
	public function logs($id)
	{
		check_access(46,$this->session->type_id);
		
		
		$data['access'] = $this->data['access'];
		
		$data['userdata'] = $this->userdata;
		$data['page'] = "datalogs";
		$data['id'] =$id;
		
		$data['judul'] = "Data Logs";
		$data['deskripsi'] = "Detail Konektor";
		$this->template->views('chargebox/datalogs',  $data);
	}
	
	
	
	public function datajson()
	{
		$queryowner=getqueryowner();
		
		$whereData = " where o.chargebox_id!='' $queryowner " ;
		check_access(46,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$search = $this->db->escape_like_str($post['search']['value']);
				$whereData .=" AND (
				o.nama_chargebox LIKE '%".$search."%' ESCAPE '!' or o.chargebox_id LIKE '%".$search."%' ESCAPE '!'
				)";
			}

			$selectData = "SELECT o.id_chargebox as id,o.chargebox_id,o.nama_chargebox,o.last_ping,t.name AS mitra,COUNT(d.id) AS jumkonektor,
			a.nama_area,a.alamat,o.id_mitra FROM t_chargebox o
			LEFT JOIN `t_connector_detail` d ON d.`chargebox_id`=o.`chargebox_id` AND d.`connector_id`!=0
			LEFT JOIN t_mitra t ON o.id_mitra=t.id_mitra 
			LEFT JOIN t_area a ON o.id_area=a.id_area
			 ".$whereData." GROUP BY o.id_chargebox,o.chargebox_id,o.nama_chargebox,o.last_ping,t.name,a.nama_area,a.alamat,o.id_mitra";

			$sql_total = "SELECT COUNT(*) AS jml FROM t_chargebox o ".$whereData;
			$query_total = $this->db->query($sql_total);

			$sql_filtered = $selectData;
			$query_filtered = $this->db->query($sql_filtered);

			$orderColumn = isset($post['columns'][$post["order"][0]["column"]]['data']) ? $post['columns'][$post["order"][0]["column"]]['data'] : 'nama_chargebox';
			$allowedOrder = array('chargebox_id','nama_chargebox','last_ping','mitra','nama_area','alamat','jumkonektor','id');
			if (!in_array($orderColumn, $allowedOrder)) $orderColumn = 'nama_chargebox';
			$orderDir = (isset($post["order"][0]["dir"]) && strtolower($post["order"][0]["dir"]) == 'desc') ? 'DESC' : 'ASC';

			$sql  = $sql_filtered." ORDER BY ".$orderColumn." ".$orderDir." limit ".intval($post['start']).",".intval($post['length']);
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['chargebox_id'] = $r['chargebox_id'];
              	$nestedData['nama_chargebox'] = $r['nama_chargebox'];
				
				$base= base64_encode($r['chargebox_id']);
				$nestedData['jumkonektor'] = '<a href="'. base_url("chargebox/detailconnector/".$base."").' "title="Lihat">'.$r['jumkonektor'].'</a>';
                $nestedData['last_ping'] =    date("d-M-Y H:i:s", strtotime($r['last_ping']));
				$nestedData['mitra'] = $r['mitra'];
				$nestedData['id_mitra'] = $r['id_mitra'];
				$nestedData['nama_area'] = $r['nama_area'];
				$nestedData['alamat'] = $r['alamat'];
				
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
                $hapus =$akses->d ?'<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id'].');"><i class="fa fa-trash"></i></a>' :"";
				$logs ='<a href="'. base_url("chargebox/logs/".$base."").' "title="Logs" class="btn btn-sm btn-info"><i class="fa fa-book"></i></a>';
				$nestedData['aksi']=$ubah." ".$hapus." ".$logs;
				$data[] = $nestedData;
                $no++;
            }
			 }
			 else $data=[];
			$datanya= array(
					'draw' => intval($post["draw"]),
					'recordsTotal' =>  (int) $query_total->row()->jml,
					'recordsFiltered' => $query_filtered->num_rows(),
					'data' => $data
				);
		
			echo json_encode($datanya);
		}else{
			echo json_encode(array());
		}
	}
	
	public function datadetailjson($id)
	{
		
		
		$whereData = " where chargebox_id='$id' and connector_id!=0" ;
		check_access(46,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				chargebox_id LIKE '%".$post['search']['value']."%' 
				)";
			}
			
			$sql_filtered  = "select id,connector_id,electric_power,connector_type,harga_perkwh,harga_perjam from t_connector_detail
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
				$nestedData['connector_id'] = $r['connector_id'];
                $nestedData['electric_power'] = $r['electric_power'];
				$nestedData['connector_type'] =  $r['connector_type'];
				$nestedData['harga_perkwh'] = $r['harga_perkwh'];
				$nestedData['harga_perjam'] =  $r['harga_perjam'];
			   
			    $ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].');"><i class="fa fa-edit"></i></a>' : "";
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
	
	
	public function datalogsjson($id)
	{
		
		
		$whereData = " where chargebox_id='$id' and connector_id!=0" ;
		check_access(46,$this->session->type_id);
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				chargebox_id LIKE '%".$post['search']['value']."%' 
				)";
			}
			
			$sql_filtered  = "select id,chargebox_id, connector_id,waktu,status,error_code,
			info from t_connector_status
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
				$nestedData['chargebox_id'] = $r['chargebox_id'];
                $nestedData['connector_id'] = $r['connector_id'];
				$nestedData['waktu'] =  $this->ketwaktu(($r['waktu']));
				$nestedData['status'] =  $r['status'];
				$nestedData['error_code'] =  $r['error_code'];
			    $nestedData['info'] =  $r['info'];
			   
               
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
	
	public function hapus(){
		$status="gagal";
	      
		    $this->db->where('owner_id', $_POST['owner_id']);
			$simpan=$this->db->delete("owner");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	
	public function getdatachargebox(){
		check_access(46,$this->session->type_id);
		$this->output->set_content_type('application/json');

		$id = $this->input->post('id');
		$this->db->where('id_chargebox', $id);
		$data = $this->db->get('t_chargebox')->row();

		if (!$data) {
			echo json_encode(array('success' => false, 'message' => 'Data tidak ditemukan'));
			return;
		}

		echo json_encode($data);
	}
	
	public function getdataconnector(){
			$this->db->where('id', $_POST['id']);
			$data = $this->db->get('t_connector_detail')->row();
		    echo json_encode($data);
	}
	
	public function getdatamitra(){
		$id=$_POST['owner_id'];
			$sql="select * from owner where owner_id=$id";
			$query= $this->db->query($sql);
		    echo json_encode($query->row());
	}
	
	public function simpanmitra(){
		$status="gagal";
		 
		 $responreg= json_decode($this->regmitra($_POST['owner_name'],$_POST['owner_email'],$_POST['owner_phone'],$_POST['owner_password']),true);
		  if( array_key_exists("status",$responreg)){
		      if( $responreg['status']=="success"){
                $nomorkartu=$responreg['no_kartu'];
             }
		  }
		      
		      
		     
            else {
                
            	echo  $responreg['msg'];
            	return;
            }
        
		   $datasimpan = array(
				'owner_name' => $_POST['owner_name'],
				'owner_email' => $_POST['owner_email'],
				'owner_cell' 	=>  $_POST['owner_phone'],
				'owner_cardnumber' 	=>  $nomorkartu,
				'owner_address' 	=> $_POST['owner_address'],
				'fee' => $_POST['owner_fee'],
				'owner_password' => md5($_POST['owner_password']),
                 );
              
		       $simpan = $this->db->insert('owner', $datasimpan);
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }

	public function lokasi(){
		check_access(49,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "Lokasi";
		$data['judul'] = "Lokasi ChargeBox";
		$data['deskripsi'] = "";
		
		$mesin = $this->M_master->lokasi();
		
	  $markers = [];
	  $infowindow = [];
	 

	  foreach($mesin as $value) {
		$markers[] = [
			$value->name, $value->lat, $value->lng,$value->id
		];          
		$infowindow[] = [
		 "<h4>".$value->id."</h4><p>".$value->name."</p>"
		];
	  }
	  
	  $data['markers'] = json_encode($markers);
	  $data['infowindow'] = json_encode($infowindow);
   
	  $this->template->views('chargebox/peta',  $data);
	  
  }
	
	public function simpanubah(){
		$status="gagal";
		
		   $datasimpan = array(
				'description' => $_POST['deskripsi'],
				'tenant_pk' => $_POST['tenant'],
				'duration_unit' 	=> $_POST['satuandurasi'],
				
				'location_latitude' => $_POST['lat'],
				'location_longitude' 	=> $_POST['vlong'],
				'use_ppn' 	=> $_POST['pakaippn'],
				'ppn' 	=> $_POST['pakaippn']==1?  $this->M_master->ppn():null,
				'pju' 	=> $_POST['pju'],
					
                 );
        
		$this->db->where('charge_box_id', $_POST['id']);
		$simpan=$this->db->update("charge_box", $datasimpan);
		
		if($simpan) {
		
		
		$status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubahconnector(){
		$status="gagal";
		
		   $datasimpan = array(
				'electric_power' => $_POST['electric_power'],
				'connector_type' => $_POST['connector_type'],
			
				'harga_perjam' 	=>  $_POST['harga_perjam'],
				'harga_perkwh' 	=> $_POST['harga_perkwh'],
				
					
                 );
        
		$this->db->where('id', $_POST['id']);
		$simpan=$this->db->update("t_connector_detail", $datasimpan);
		
		if($simpan) {
		
		
		$status="sukses";
		}
		echo  $status;
      
    }
    
    
   
	
	
	
	
	
	
}
