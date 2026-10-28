<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Barang extends  AUTH_Controller {

	
    public function __construct()
    {
		parent::__construct();
		$this->load->model('M_mitra');
	    $this->load->model('M_barang');
	     //date_default_timezone_set("Asia/Jakarta");
    }
	public function index()
	{	
			$data = array(
		  'title' => "Modules &rsaquo; Datatables"
			);
   
		 $this->load->view('pelanggan/index.php', $data);
	}
	
	
	public function databarang()
	{
			
		check_access(22,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "barang";
		$data['judul'] = "Data Barang";
		$data['deskripsi'] = "Manage Data barang";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('barang/databarang',  $data);
		
	}
	
	public function penyesuaianstok()
	{
			
		check_access(29,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "penyesuaianstok";
		$data['judul'] = "Data Penyesuaian Stok";
		$data['deskripsi'] = "";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('barang/penyesuaianstok',  $data);
		
	}
	
		public function datakategori()
	{
			
		check_access(19,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "kategori";
		$data['judul'] = "Data Kategori";
		$data['deskripsi'] = "Manage Data Toko";
	
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('barang/datakategori',  $data);
		
	}
	
	public function terlaris()
	{
			
		check_access(25,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "terlaris";
		$data['judul'] = "Produk terlaris";
		$data['deskripsi'] = "";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$this->template->views('barang/produkterlaris',  $data);
		
	}
	
		public function stokbarang()
	{
			
		check_access(23,$this->session->type_id);
		
		$data['access'] = $this->data['access'];
		$data['userdata'] = $this->userdata;
		$data['page'] = "stokbarang";
		$data['judul'] = "Data Stok Barang";
		$data['deskripsi'] = "";
		$data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['daftarkategori'] = $this->M_barang->getdaftarkategoribymitra(getidrole());
		$this->template->views('barang/laporanstok',  $data);
		
	}
	
		public function getdatakategorifromshop()
	{
			
	
		
		$shopid=$_POST['idtoko'];
		echo json_encode( $this->M_barang->getdatakategorifromshop($shopid));
	
		
	}
	
	public function datakategorijson()
	{
		//$whereData = " where u.status_publish=1 and(u.disetujui=1 or u.last_id_approval is null) and u.isspk=0";
	
		check_access(19,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$querytoko=$shopid==0 ? "" :" and s.shop_id=$shopid";
		$queryowner=getqueryowner();
		$akses=$this->data['access'];
		$post = $this->input->post();
		$whereData = " where o.product_category_id>0 $queryowner $querytoko";
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.product_category_name LIKE '%".$post['search']['value']."%' 
				)";
			}
			$sql_filtered  = "SELECT o.product_category_id id,o.product_category_name as nama_kategori,o.status,s.shop_name as nama_toko
			FROM product_category o JOIN shop s ON o.shop_id=s.shop_id
			 " .$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['nama_kategori'] = $r['nama_kategori'];
                $nestedData['nama_toko'] = $r['nama_toko'];
			
				$nestedData['status'] =  $r['status']==1 ? "aktif" : "non aktif";
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
	
	public function produkterlarisjson()
	{
		//$whereData = " where u.status_publish=1 and(u.disetujui=1 or u.last_id_approval is null) and u.isspk=0";
	
		check_access(25,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$dilimit=$_POST['limit'];
		$jeniswaktu=isset($_POST['jeniswaktu']) ? $_POST['jeniswaktu'] : 0 ;
		$bulan=isset($_POST['bulan']) ? $_POST['bulan'] : 0 ;
		$tahun=isset($_POST['tahun']) ? $_POST['tahun'] : 0 ;
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
		$queryowner=getqueryowner();
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		$querywaktu= $jeniswaktu==0 ? "" : " and (`month`=$bulan and `year`=$tahun)";
		$whereData = " where o.product_id>0 $queryowner $querytoko $querywaktu group by t.product_id";
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.product_name LIKE '%".$post['search']['value']."%' group by t.product_id
				)";
			}
			$sql_filtered  = "SELECT o.product_id as id,o.product_name as nama,s.shop_name as nama_toko,sum(jumlah) jumlah,sum(total_trans) as total,sum(modal_trans) as modal,sum(total_trans-modal_trans) untung
			FROM products o JOIN shop s ON o.shop_id=s.shop_id join statistik_barang t on o.product_id=t.product_id
			 " .$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			if($dilimit==0)
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			else
				$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit $dilimit";
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['nama'] = $r['nama'];
                $nestedData['nama_toko'] = $r['nama_toko'];
			    $nestedData['jumlah'] = $r['jumlah'];
                $nestedData['total'] = number_format($r['total'],0);
			    $nestedData['modal'] = number_format($r['modal'],0);
			    $nestedData['untung'] = number_format($r['untung'],0);
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
	
	public function databarangjson()
	{
	
	
		check_access(22,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
		$queryowner=getqueryowner();
		$akses=$this->data['access'];
		$post = $this->input->post();
		$whereData = " where o.product_id>0 $queryowner $querytoko";
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.product_name LIKE '%".$post['search']['value']."%' or o.product_code LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "SELECT o.product_id id,o.product_code as kodebarang,o.product_name namabarang,c.product_category_id as idkategori,c.product_category_name kategori,o.product_description deskripsi,o.product_sell_price hargajual,o.product_buy_price AS hargabeli
			,product_stock stok,shop_name as namatoko,o.status,o.shop_id as idtoko,min_product_stock minstok
		   FROM products o JOIN `product_category` c ON o.`product_category_id`=c.product_category_id
			JOIN shop s ON o.shop_id=s.shop_id 
			 " .$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['kodebarang'] = $r['kodebarang'];
                $nestedData['namabarang'] = $r['namabarang'];
				$nestedData['kategori'] =  $r['kategori'];
				$nestedData['status'] = $r['status']==1  ? "Aktif" : "NonAktif";
				$nestedData['deskripsi'] = $r['deskripsi'];
				$nestedData['stok'] =$r['stok'];
				$nestedData['minstok'] =$r['minstok'];
				$nestedData['hargajual'] = number_format($r['hargajual'],0);
                $nestedData['hargabeli'] = number_format($r['hargabeli'],0);
                $nestedData['namatoko'] = $r['namatoko'];
				$ubah = $akses->u ? '<a href="javascript:void(0);" title="Ubah" class="btn btn-sm btn-warning" onclick="ubah('.$r['id'].','.$r['idtoko'].');"><i class="fa fa-edit"></i></a>' : "";
                $hapus =$akses->d ?'<a href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" onclick="hapus('.$r['id'].');"><i class="fa fa-trash"></i></a>' :"";
                $ubahstok = $akses->u ? '<a href="javascript:void(0);" title="Ubah Stok" class="btn btn-info" onclick="ubahstok('.$r['id'].','.$r['idtoko'].');"><i class="fa fa-edit"></i></a>' : "";
				$nestedData['aksi']=$ubah." ".$hapus." ".$ubahstok;
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
	
		public function penyesuaianstokjson()
	{
	
	
		check_access(29,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
		$kategori=$_POST['kategori'];
		$queryowner=getqueryowner();
		$akses=$this->data['access'];
		$post = $this->input->post();
		
		if(	$kategori==0)  $querykategori="";
		else $querykategori=" and o.product_category_id=" .$kategori;
		
		$querywaktu=$jeniswaktu==1 ? " and month(jam)='$bulan' and year(jam)='$tahun'" :" and (date(jam)>='$tanggal1' and date(jam)<='$tanggal2')";
		
		$whereData = " where o.product_id>0 $queryowner $querytoko $querykategori $querywaktu";
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.product_name LIKE '%".$post['search']['value']."%' or o.product_code LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "SELECT p.id,o.product_code as kodebarang,o.product_name namabarang,c.product_category_name kategori,o.product_description deskripsi,p.jam,
			shop_name as namatoko,p.stok_awal,p.jumlah,p.alasan
		   FROM products o JOIN `product_category` c ON o.`product_category_id`=c.product_category_id join penyesuaian_stok p on p.product_id=o.product_id
			JOIN shop s ON o.shop_id=s.shop_id 
			 " .$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['kodebarang'] = $r['kodebarang'];
                $nestedData['namabarang'] = $r['namabarang'];
				$nestedData['kategori'] =  $r['kategori'];
			    $nestedData['deskripsi'] = $r['deskripsi'];
				$nestedData['namatoko'] = $r['namatoko'];
				$nestedData['stok_awal'] = $r['stok_awal'];
				$nestedData['jumlah'] = $r['jumlah'];
				$nestedData['alasan'] = $r['alasan'];
				$nestedData['waktu'] = 	date('d M Y H:i:s', strtotime($r['jam']));
			
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
	
		public function lapstokjson()
	{
	
	
		check_access(23,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$statusstok=$_POST['statusstok'];
		$kategori=$_POST['kategori'];
		switch(	$statusstok){
		    case -1: 
		        $querystok="";
		        break;
		    case 0: 
		        $querystok=" and product_stock=0";
		        break;
		    case 1: 
		        $querystok=" and product_stock<=min_product_stock";
		        break;
		}
		
		if(	$kategori==0)  $querykategori="";
		else $querykategori=" and o.product_category_id=" .$kategori;
	
		
		
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
		$queryowner=getqueryowner();
		$akses=$this->data['access'];
		$post = $this->input->post();
		$whereData = " where o.product_id>0 $queryowner $querytoko $querystok $querykategori";
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				o.product_name LIKE '%".$post['search']['value']."%' or o.product_code LIKE '%".$post['search']['value']."%'
				)";
			}
			$sql_filtered  = "SELECT o.product_id id,o.product_code as kodebarang,o.product_name namabarang,c.product_category_id as idkategori,c.product_category_name kategori,o.product_description deskripsi,o.product_sell_price hargajual,o.product_buy_price AS hargabeli
			,product_stock stok,shop_name as namatoko,o.status,o.shop_id as idtoko,min_product_stock minstok
		   FROM products o JOIN `product_category` c ON o.`product_category_id`=c.product_category_id
			JOIN shop s ON o.shop_id=s.shop_id 
			 " .$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['id'] = $r['id'];
				$nestedData['kodebarang'] = $r['kodebarang'];
                $nestedData['namabarang'] = $r['namabarang'];
				$nestedData['kategori'] =  $r['kategori'];
				$nestedData['status'] = $r['status']==1  ? "Aktif" : "NonAktif";
				$nestedData['deskripsi'] = $r['deskripsi'];
				$nestedData['stok'] =$r['stok'];
				$nestedData['minstok'] =$r['minstok'];
				$nestedData['hargajual'] = number_format($r['hargajual'],0);
                $nestedData['hargabeli'] = number_format($r['hargabeli'],0);
                $nestedData['namatoko'] = $r['namatoko'];
				
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
	
	public function hapuskategori(){
		$status="gagal";
	      
		    $this->db->where('product_category_id', $_POST['idkategori']);
			$simpan=$this->db->delete("product_category");
		if($simpan) $status="sukses";
			echo  $status;
      
    }
	

	
	public function getdatakategori(){
		    $id=$_POST['id'];
			$sql="select *
			from product_category where product_category_id=?";
			$query= $this->db->query($sql,[$id]);
		    echo json_encode($query->row());
	}
	
		public function getdatabarang(){
		    $idtoko=$_POST['idtoko'];
		    $idbarang=$_POST['idbarang'];
		    //data supplier
			$sql="SELECT suppliers_id as id,suppliers_name as namasupplier from suppliers where shop_id=? and status=1";
			$query= $this->db->query($sql,[$idtoko]);
			$datasupplier= $query->result();
			
			//data kategori
			$sql="SELECT product_category_id as id,product_category_name as namakategori from product_category where shop_id=? and status=1";
			$query= $this->db->query($sql,[$idtoko]);
			$datakategori= $query->result();
			
			//data satuan
			$sql="SELECT weight_unit_id as id,weight_unit_name as namasatuan from weight_unit where status=1";
			$query= $this->db->query($sql);
			$datasatuan= $query->result();
			
			
			//data barang
			$sql="SELECT product_id id,product_code as kodebarang,product_name namabarang,product_category_id as idkategori,product_description deskripsi,min_product_stock as minstok,
			product_sell_price hargajual,product_buy_price AS hargabeli,product_weight_unit_id as idsatuan,product_supplier_id as idsupplier,shop_id as idtoko,
			status,product_image as foto FROM products where product_id=?";
			$query= $this->db->query($sql,[$idbarang]);
			$databarang= $query->row();
			
				$data=[
			    "datasupplier" =>	$datasupplier,
			    "datakategori" =>	$datakategori,
			    "datasatuan" =>	$datasatuan,
			    "databarang" =>	$databarang,
			    ];
		    echo json_encode($data);
		    //echo json_encode($query->result());
	}
	
	public function getdatabarangstok(){
		    $idtoko=$_POST['idtoko'];
		    $idbarang=$_POST['idbarang'];
		    //data supplier
			
			
			
			//data barang
			$sql="SELECT * FROM products where product_id=?";
			$query= $this->db->query($sql,[$idbarang]);
		
		
		    echo json_encode($query->row());
	}
	
	public function gettambahbarang(){
		    $idtoko=$_POST['idtoko'];
		   
		    //data supplier
			$sql="SELECT suppliers_id as id,suppliers_name as namasupplier from suppliers where shop_id=? and status=1";
			$query= $this->db->query($sql,[$idtoko]);
			$datasupplier= $query->result();
			
			//data kategori
			$sql="SELECT product_category_id as id,product_category_name as namakategori from product_category where shop_id=? and status=1";
			$query= $this->db->query($sql,[$idtoko]);
			$datakategori= $query->result();
			
			//data satuan
			$sql="SELECT weight_unit_id as id,weight_unit_name as namasatuan from weight_unit where status=1";
			$query= $this->db->query($sql);
			$datasatuan= $query->result();
			
		
			
				$data=[
			    "datasupplier" =>	$datasupplier,
			    "datakategori" =>	$datakategori,
			    "datasatuan" =>	$datasatuan,
			   
			    ];
		    echo json_encode($data);
		    //echo json_encode($query->result());
	}
	
	public function simpankategori(){
		$status="gagal";
			$datasimpan = array(
				'product_category_name' => $_POST['nama'],
				'shop_id' => $_POST['toko'],
				'status' 	=>  $_POST['status'],
				'owner_id' 	=>  getidrole(),
			
                 );
              
		       $simpan = $this->db->insert('product_category', $datasimpan);
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }
    
    public function simpandatastok(){
		$status="gagal";
		
		
			$datasimpan = array(
				'product_id' => $_POST['product_id'],
				'stok_awal' =>  $_POST['stok'],
				'jumlah' 	=>  $_POST['jumlah'],
				'alasan' 	=>  $_POST['reason'],
				'shop_id' 	=>  $_POST['shop_id'],
				'owner_id' 	=>  $_POST['owner_id'],
		        'jam' 	=>  date("Y-m-d H:i:s"),
                 );
              
		       $simpan = $this->db->insert('penyesuaian_stok', $datasimpan);
		
		if($simpan) {
			  
		    $status="sukses";
		}
		echo  $status;
      
    }
	
	public function simpanubahkategori(){
		$status="gagal";
		$filebaru = basename($_FILES['filefoto']['name']);
		$idtoko=$_POST['toko'];
		if (empty($filebaru)) {
            $newfilename =  $_POST['fotolama'];
        }
        else {
            
             $sms_code = time();
            //generate random file name
            $temp = explode(".", $_FILES["filefoto"]["name"]);
            $newfilename = $sms_code . '.' . end($temp);
            
            $config['upload_path'] = './uploads/fotokategori/'.$idtoko;
            $config['allowed_types'] = '*';
            //$config['allowed_types'] = 'jpg|gif|png|image/jpeg';
            $config['max_size'] = 10000;
            $config['file_name'] = $newfilename;
            $this->load->library('upload', $config);
            
            
            if ($this->upload->do_upload('filefoto')) {
			 //echo  './uploads/fotobarang/'.$idtoko.'/'. $newfilename;return;				$statusfotobarang="suksess";
                //Compress Image
                $statusfotobarang="sukses";
                $config['image_library']='gd2';
                $config['source_image']='./uploads/fotokategori/'.$idtoko.'/'. $newfilename;
                $config['create_thumb']= FALSE;
                $config['maintain_ratio']= FALSE;
                $config['quality']= '80%';
                $config['width']= 300;
                $config['height']= 200;
                $config['new_image']= './uploads/fotokategori/'.$idtoko.'/'. $newfilename;
                $this->load->library('image_lib', $config);
                $this->image_lib->resize();			
                
            }
                // else echo $this->upload->display_errors();				// return;
            
            
        }
		   $datasimpan = array(
				'product_category_name' => $_POST['nama'],
				'shop_id' => $_POST['toko'],
				'status' 	=>  $_POST['status'],
				'icon' 	=>  $newfilename,
				
					
                 );
        
		$this->db->where('product_category_id', $_POST['idkategori']);
		$simpan=$this->db->update("product_category", $datasimpan);
		
		if($simpan) {
			
			
			
			
			
		
		
		$status="sukses";
		}
		echo  $status;
      
    }
    
    	public function simpanubahbarang(){
		$status="gagal";		
		$statusfotobarang="gagal";
		
		 $filebaru = basename($_FILES['filefoto']['name']);
         $idtoko=$_POST['idtoko'];
        		if (empty($filebaru)) {
            $newfilename =  $_POST['fotolama'];
        }
        else {
            
             $sms_code = time();
            //generate random file name
            $temp = explode(".", $_FILES["filefoto"]["name"]);
            $newfilename = $sms_code . '.' . end($temp);
            
            $config['upload_path'] = './uploads/fotobarang/'.$idtoko;
            $config['allowed_types'] = '*';
            //$config['allowed_types'] = 'jpg|gif|png|image/jpeg';
            $config['max_size'] = 10000;
            $config['file_name'] = $newfilename;
            $this->load->library('upload', $config);
            
            
            if ($this->upload->do_upload('filefoto')) {
			 //echo  './uploads/fotobarang/'.$idtoko.'/'. $newfilename;return;				$statusfotobarang="suksess";
                //Compress Image
                $statusfotobarang="sukses";
                $config['image_library']='gd2';
                $config['source_image']='./uploads/fotobarang/'.$idtoko.'/'. $newfilename;
                $config['create_thumb']= FALSE;
                $config['maintain_ratio']= FALSE;
                $config['quality']= '80%';
                $config['width']= 300;
                $config['height']= 200;
                $config['new_image']= './uploads/fotobarang/'.$idtoko.'/'. $newfilename;
                $this->load->library('image_lib', $config);
                $this->image_lib->resize();			
                
            }
                // else echo $this->upload->display_errors();				// return;
            
            
        }
		
		   $datasimpan = array(
				'product_code' => $_POST['kodebarang'],
				'product_name' => $_POST['namabarang'],
				'product_category_id' => $_POST['kategori'],
				'product_description' => $_POST['deskripsi'],
				'product_sell_price' => $_POST['hargajual'],
				'product_buy_price' => $_POST['harga_beli'],
				'product_weight_unit_id' => $_POST['satuan'],
				'product_supplier_id' => $_POST['supplier'],
				'min_product_stock' => $_POST['minstok'],
			    'product_image' => $newfilename,
			
				'status' 	=>  $_POST['status'],
							);
        
		$this->db->where('product_id', $_POST['id']);
		$simpan=$this->db->update("products", $datasimpan);
		
		if($simpan) {          
		    if($statusfotobarang==="sukses")
			$status="suksesfull";			
			else $status="sukses" ;
		}
		echo  $status;
      
    }
    
    
    public function simpanbarang(){
		$status="gagal";
		$statusfotobarang="gagal";
		$filebaru = basename($_FILES['filefoto']['name']);
        $idtoko=$_POST['idtoko'];

        if (empty($filebaru)) {
            $newfilename = null;
        }
        else {
            
             $sms_code = time();
            //generate random file name
            $temp = explode(".", $_FILES["filefoto"]["name"]);
            $newfilename = $sms_code . '.' . end($temp);
            
            $config['upload_path'] = './uploads/fotobarang/'.$idtoko;
            $config['allowed_types'] = '*';
            //$config['allowed_types'] = 'gif|jpg|png';
            $config['max_size'] = 10000;
            $config['file_name'] = $newfilename;
            $this->load->library('upload', $config);
            
            
            if ($this->upload->do_upload('filefoto')) {
				$statusfotobarang="sukses";
                //Compress Image
                $config['image_library']='gd2';
                $config['source_image']='./uploads/fotobarang/'.$idtoko.'/'. $newfilename;
                $config['create_thumb']= FALSE;
                $config['maintain_ratio']= FALSE;
                $config['quality']= '80%';
                $config['width']= 300;
                $config['height']= 200;
                $config['new_image']= './uploads/fotobarang/'.$idtoko.'/'. $newfilename;
                $this->load->library('image_lib', $config);
                $this->image_lib->resize();
		
		
				
        	
                }
            
            
        }
		
		   $datasimpan = array(
				'product_code' => $_POST['kodebarang'],
				'product_name' => $_POST['namabarang'],
				'product_category_id' => $_POST['kategori'],
				'product_description' => $_POST['deskripsi'],
				'product_sell_price' => $_POST['hargajual'],
				'product_buy_price' => $_POST['harga_beli'],
				'product_weight_unit_id' => $_POST['satuan'],
				'product_supplier_id' => $_POST['supplier'],
				'product_stock' => $_POST['stok'],
				'min_product_stock' => $_POST['minstok'],
			    'shop_id' => $idtoko,
			    'owner_id' => getidrole(),
			    'product_image' => $newfilename,
				'status' 	=>  $_POST['status'],
				
					
                 );
        
	 $simpan = $this->db->insert('products', $datasimpan);
		
		if($simpan) {
		if($simpan) {          
		    if($statusfotobarang==="sukses")
			$status="suksesfull";			
			else $status="sukses" ;
		}
		
		
		}
		echo  $status;
      
    }
    
    
   
}
