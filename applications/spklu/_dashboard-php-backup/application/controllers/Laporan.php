<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require('./excel/vendor/autoload.php');

use PhpOffice\PhpSpreadsheet\Helper\Sample;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
class Laporan extends  AUTH_Controller {

	
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
	
		
	
	public function pemasukan()
	{
			
		check_access(15,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		

		$data['page'] = "laporanpemasukan";
		
		$data['judul'] = "Laporan Pemasukan ";
		$data['deskripsi'] = "Data Pemasukan";
		
		
		$this->template->views('laporan/laporan_pemasukan',  $data);
		
	}
		public function labarugi()
	{
			
		check_access(27,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
	    $data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['page'] = "laporanlabarugi";
		
		$data['judul'] = "Laporan Laba Rugi ";
		$data['deskripsi'] = "";
		
		
		$this->template->views('laporan/laporan_labarugi',  $data);
		
	}
	
		public function aruskas()
	{
			
		check_access(28,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
	    $data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['page'] = "laporanaruskas";
		
		$data['judul'] = "Laporan Arus Kas";
		$data['deskripsi'] = "";
		
		
		$this->template->views('laporan/laporanaruskas',  $data);
		
	}
	
		public function jurnal()
	{
			
		check_access(38,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		
	    $data['daftartoko'] = $this->M_mitra->getdaftartoko(getidrole());
		$data['page'] = "laporanjurnal";
		
		$data['judul'] = "Laporan Jurnal";
		$data['deskripsi'] = "";
		
		
		$this->template->views('laporan/laporan_jurnal',  $data);
		
	}
		public function saldomitrabulanan()
	{
			
		check_access(17,$this->session->type_id);
		
		$data['userdata'] = $this->userdata;
		$data['access'] = $this->data['access'];
		

		$data['page'] = "laporansaldomitra";
		
		$data['judul'] = "Laporan Saldo Mitra ";
		$data['deskripsi'] = "Data Saldo Mitra";
		
		
		$this->template->views('laporan/laporan_saldomitra',  $data);
		
	}
	
	public function labarugijson_old()
	{
		
		check_access(27,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
	    $queryowner=getqueryownerbaru('o');
	     $subqueryowner=getqueryownerbaru('n');
		$querywaktu=$jeniswaktu==0 ?  " and month(o.order_date)='$bulan' and year(o.order_date)='$tahun'" : " and date(o.order_date)>='$tanggal1' and date(o.order_date)<='$tanggal2' ";
		$subquerywaktu=$jeniswaktu==0 ?  " and month(n.expense_date)='$bulan' and year(n.expense_date)='$tahun'" : " and date(n.expense_date)>='$tanggal1' and date(n.expense_date)<='$tanggal2' ";
		
		
		
		//$querystatus $querystatusbayar
		$akses=$this->data['access'];
		
		$post = $this->input->post();
		$whereData = " where o.order_id>0 $queryowner $querytoko $querywaktu GROUP BY o.shop_id";
		$whereData2="  where n.expense_id>0 $subqueryowner  $subquerywaktu and n.shop_id=o.shop_id ";
		$subquery=" (SELECT SUM(expense_amount) FROM expense n  $whereData2 )";
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
			
				$whereData .=" AND (
				o.shop_id LIKE '%".$post['search']['value']."%'";
			}
		
			$sql_filtered  = "SELECT SUM(order_price) AS transaksi,SUM(total_buy) AS modal,o.shop_id,s.shop_name as namatoko,
                            $subquery as beban FROM order_list o join shop s on o.shop_id=s.shop_id
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
              $untung=$r['transaksi']-$r['modal']-$r['beban'];
				$nestedData['transaksi'] = number_format($r['transaksi'],0);
				$nestedData['modal'] =  number_format($r['modal'],0);
				$nestedData['beban'] = number_format($r['beban'],0);
                $nestedData['namatoko'] = $r['namatoko'];
                $nestedData['untung'] = number_format($untung,0);
                $excel = '<a href="javascript:void(0);" title="Excel" class="btn btn-sm btn-warning" onclick="excel('.$r['shop_id'].',\''.$r['namatoko'].'\');"><i class="fa fa-file-excel-o"></i></a>' ;
		    	$nestedData['aksi']=$excel;
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
	
	public function labarugijson()
	{
		
		check_access(27,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$querytoko=$shopid==0 ? "" :" and o.shop_id=$shopid";
	    $queryowner=getqueryownerbaru('o');
	     $subqueryowner=getqueryownerbaru('n');
		$querywaktu=$jeniswaktu==0 ?  " and month(o.tanggal)='$bulan' and year(o.tanggal)='$tahun'" : " and date(o.tanggal)>='$tanggal1' and date(o.tanggal)<='$tanggal2' ";
		
		
		
		//$querystatus $querystatusbayar
		$akses=$this->data['access'];
		
		$post = $this->input->post();
		$whereData = " where o.nmr>0 $queryowner $querytoko $querywaktu GROUP BY o.shop_id";
		
	
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
			
				$whereData .=" AND (
				o.shop_id LIKE '%".$post['search']['value']."%'";
			}
		
			$sql_filtered  = "SELECT o.shop_id,s.shop_name as namatoko,
                                SUM(case when jns2='Pendapatan'
                                        				AND jns='2' then (kredit-debet) end ) as transaksi,
                                SUM(case when jns2='Beban'
                                        				AND jns='1' and nama_akun='HPP' then (debet-kredit) end ) AS modal, 
                                SUM(case when jns2='Beban'
                                        				AND jns='1' and nama_akun!='HPP' then (debet-kredit) end ) AS beban 
                                        				FROM jurnal o JOIN akun a ON o.no_akun=a.no_akun  join shop s on o.shop_id=s.shop_id
                                        			
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
              $untung=$r['transaksi']-$r['modal']-$r['beban'];
				$nestedData['transaksi'] = number_format($r['transaksi'],0);
				$nestedData['modal'] =  number_format($r['modal'],0);
				$nestedData['beban'] = number_format($r['beban'],0);
                $nestedData['namatoko'] = $r['namatoko'];
                $nestedData['untung'] = number_format($untung,0);
                $excel = '<a href="javascript:void(0);" title="Excel" class="btn btn-sm btn-warning" onclick="excel('.$r['shop_id'].',\''.$r['namatoko'].'\');"><i class="fa fa-file-excel-o"></i></a>' ;
		    	$nestedData['aksi']=$excel;
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
	
	
	public function pemasukanjson()
	{
		
		check_access(15,$this->session->type_id);
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
	
		$querywaktu=" and month(tanggal)='$bulan' and year(tanggal)='$tahun'";
		
		
		//$querystatus $querystatusbayar
		$akses=$this->data['access'];
		
		$post = $this->input->post();
	

		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData = " where i.id>0 ";
				$whereData .=" AND (
				owner_name LIKE '%".$post['search']['value']."%' or shop_name LIKE '%".$post['search']['value']."%'  )  $querywaktu";
			}
			else $whereData = " where i.id>0 $querywaktu";
			$sql_filtered  = "select w.owner_name,s.shop_name,i.tanggal,jumlah as jumlah from iuran i join owner w
			on w.owner_id=i.owner_id join shop s on s.shop_id=i.shop_id 
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
              
				$nestedData['owner_name'] = $r['owner_name'];
				$nestedData['jumlah'] =  number_format($r['jumlah'],0);
				$nestedData['shop_name'] = $r['shop_name'];
                $nestedData['tanggal'] = $r['tanggal'];
			
				
			
					$show ="";
				$nestedData['aksi']=$show;//." ".$ubah." ".$hapus;
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
	
		public function aruskasjson()
	{
	
		
		check_access(28,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$querytoko=$shopid==0 ? "" :" and s.shop_id=$shopid";
		
			$querywaktu=$jeniswaktu==1 ? " and month(tanggal)='$bulan' and year(tanggal)='$tahun'" :" and (date(tanggal)>='$tanggal1' and date(tanggal)<='$tanggal2')";
		
		$akses=$this->data['access'];
		$queryowner=getqueryownerbaru('k');
		$whereData = " where k.id>0 $queryowner $querytoko $querywaktu";
		$post = $this->input->post();
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				shop_name LIKE '%".$post['search']['value']."%' )";
			}
			$sql_filtered  = "select k.id, s.shop_name as namatoko,k.tanggal,k.jam,(case when jumlah>0 then jumlah else 0 end) as pemasukan,
			(case when jumlah <0 then -1*jumlah else 0 end) as pengeluaran,k.keterangan
			from keuangan k join shop s on k.shop_id=s.shop_id
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
				$nestedData['pemasukan'] =  number_format($r['pemasukan'],0);
				$nestedData['pengeluaran'] =number_format($r['pengeluaran'],0);
                $nestedData['keterangan'] = $r['keterangan'];
			    $nestedData['namatoko'] = $r['namatoko'];
				$nestedData['tanggal'] =date('d F Y ', strtotime($r['tanggal'])) .  date('H:i:s', strtotime($r['jam']));
				
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
	
		public function jurnaljson()
	{
	
		
		check_access(38,$this->session->type_id);
		$shopid=$_POST['shop_id'];
		$jeniswaktu=$_POST['jeniswaktu'];
		$tanggal1=$_POST['tanggal1'];
		$tanggal2=$_POST['tanggal2'];
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
		$querytoko=$shopid==0 ? "" :" and s.shop_id=$shopid";
		
			$querywaktu=$jeniswaktu==1 ? " and month(tanggal)='$bulan' and year(tanggal)='$tahun'" :" and (date(tanggal)>='$tanggal1' and date(tanggal)<='$tanggal2')";
		
		$akses=$this->data['access'];
		$queryowner=getqueryownerbaru('o');
		$whereData = " where o.nmr>0 $queryowner $querytoko $querywaktu";
		$post = $this->input->post();
		
		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData .=" AND (
				shop_name LIKE '%".$post['search']['value']."%' )";
			}
			$sql_filtered  = "select s.shop_name as namatoko,o.tanggal,o.no_akun,a.nama_akun,o.debet,o.kredit,o.no_transaksi,o.keterangan,o.nmr
                                from jurnal o join shop s on o.shop_id=s.shop_id join akun a on o.no_akun=a.no_akun
			 ".$whereData;
			
			$query_filtered = $this->db->query($sql_filtered);
			
			$sql  = $sql_filtered." ORDER BY ".$post['columns'][$post["order"][0]["column"]]['data']." ".$post["order"][0]["dir"]." limit ".$post['start'].",".$post['length'];
			$query = $this->db->query($sql);
			 $no = $post['start'] + 1;
			 if( $query->num_rows()>0){
			 $datana=$query->result_array();
            foreach ($datana as $r)
            {
				 
                
				$nestedData['no_transaksi'] = $r['no_transaksi'];
				$nestedData['debet'] =  number_format($r['debet'],0);
				$nestedData['kredit'] =number_format($r['kredit'],0);
                $nestedData['keterangan'] = $r['keterangan'];
			    $nestedData['namatoko'] = $r['namatoko'];
			    $nestedData['no_akun'] = $r['no_akun'];
			    $nestedData['nmr'] = $r['nmr'];
			     $nestedData['nama_akun'] = $r['nama_akun'];
				$nestedData['tanggal'] =getTglIndo($r['tanggal']);
				
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
	
		public function laporansaldomitrajson()
	{
		
		check_access(17,$this->session->type_id);
		$bulan=$_POST['bulan'];
		$tahun=$_POST['tahun'];
	
		$querywaktu=" and month(tanggal)='$bulan' and year(tanggal)='$tahun'";
		
		
		//$querystatus $querystatusbayar
		$akses=$this->data['access'];
		
		$post = $this->input->post();
	

		if(!empty($post))
		{
			if (!empty($post['search']['value'])) 
			{
				$whereData = " where t.id>0 ";
				$whereData .=" AND (
				owner_name LIKE '%".$post['search']['value']."%' )  $querywaktu GROUP BY h.owner_id";
			}
			else $whereData = " where h.id>0 $querywaktu GROUP BY  h.owner_id";
			$sql_filtered  = "select w.owner_id id,w.owner_name,w.owner_cell no_hp,count(h.id) jum_transaksi,sum(jumlah) as total from histori_saldo h join owner w
			on w.owner_id=h.owner_id and h.jenis='penjualan' 
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
				$nestedData['no_hp'] = $r['no_hp'];
				$nestedData['total'] =  number_format($r['total'],0);
				$nestedData['jum_transaksi'] = $r['jum_transaksi'];
                $nestedData['owner_name'] = $r['owner_name'];
			
				
			
					$show ="";
				$nestedData['aksi']=$show;//." ".$ubah." ".$hapus;
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
	
	public function excellabarugi(){
     	$shopid=$_GET['shop_id'];
 		$bulan=$_GET['bulan'];
		$tahun=$_GET['tahun'];
		$tanggal1=$_GET['tanggal1'];
		$tanggal2=$_GET['tanggal2'];
		$jeniswaktu=$_GET['jeniswaktu'];
		$namatoko=$_GET['namatoko'];
		
		$dateObj   = DateTime::createFromFormat('!m', $bulan);
       $monthName = $dateObj->format('F'); // March
		$periodebulan= $monthName ." ".$tahun;
		
		$tgl1= date("d-M-Y", strtotime($tanggal1));
			$tgl2= date("d-M-Y", strtotime($tanggal2));
		
		$periodehari= $tgl1 ." sd " .$tgl2;

    	//$shopid=1;
	//	$bulan=6;
// 		$tahun="2023";
// 		$tanggal1="2023-06-01";
// 		$tanggal2="2023-06-01";
// 		$jeniswaktu=0;
                $spreadsheet = new Spreadsheet();
                
                // Set document properties
                $spreadsheet->getProperties()->setCreator('Andoyo - Java Web Media')
                ->setLastModifiedBy('Andoyo - Java Web Medi')
                ->setTitle('Office 2007 XLSX Test Document')
                ->setSubject('Office 2007 XLSX Test Document')
                ->setDescription('Test document for Office 2007 XLSX, generated using PHP classes.')
                ->setKeywords('office 2007 openxml php')
                ->setCategory('Test result file');
                
                // Add some data
                $spreadsheet->setActiveSheetIndex(0);
                
                $spreadsheet->getActiveSheet()->mergeCells('A1:D1');
        		$spreadsheet->getActiveSheet()->setCellValue('A1', "Laporan Laba Rugi");
        		//$objPHPExcel->getActiveSheet()->getStyle('A1:J1')->applyFromArray($judul);
        		$spreadsheet->getActiveSheet()->getStyle('A1:J1')->getAlignment()
        			->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        		$spreadsheet->getActiveSheet()->getStyle("A1:J1")->getFont()->setBold( true );
               
                $spreadsheet->getActiveSheet()->mergeCells('A3:B3');
        		$spreadsheet->getActiveSheet()->setCellValue('A3', "Toko");
        		$spreadsheet->getActiveSheet()->setCellValue('C3', "$namatoko");
        
        		$spreadsheet->getActiveSheet()->mergeCells('A4:B4');
        		$spreadsheet->getActiveSheet()->setCellValue('A4', "Jenis waktu");
        		$spreadsheet->getActiveSheet()->setCellValue('C4', $jeniswaktu==0 ? "Bulanan" : "Harian");
        
        		$spreadsheet->getActiveSheet()->mergeCells('A5:B5');
        		$spreadsheet->getActiveSheet()->setCellValue('A5', "Periode");
        		$spreadsheet->getActiveSheet()->setCellValue('C5', $jeniswaktu==0 ? "$periodebulan" : "$periodehari");
        		$spreadsheet->getActiveSheet()->getStyle('C5:D5')->getAlignment()
        			->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT);
        
        
        		$spreadsheet->getActiveSheet()->setCellValue('A7', "PENDAPATAN");
        		$spreadsheet->getActiveSheet()->getStyle("A7:A7")->getFont()->setBold( true );
        		$spreadsheet->getActiveSheet()->setCellValue('A8', "No.Akun");
        		$spreadsheet->getActiveSheet()->setCellValue('B8', "Keterangan");
        		$spreadsheet->getActiveSheet()->setCellValue('C8', "Saldo");
                
                
                $spreadsheet->getActiveSheet()->getStyle('A8:C8')->getAlignment()
			->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        		$spreadsheet->getActiveSheet()
        			->getStyle('A8:C8')
        			->getFill()
        			->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
        			->getStartColor()
        			->setRGB('58804D');
        		$spreadsheet->getActiveSheet()
        			->getStyle('A8:C8')
        			->getFont()
        			->getColor()
        			->setRGB ('EEEEEE')  ;
        		$spreadsheet->getActiveSheet()->getStyle('A8:C8')->getFont()->setBold( true );
        		
        		
        		//Mulai ISI
        		$sql2=$jeniswaktu==0? "SELECT j.no_akun ,keterangan,SUM(kredit-debet) AS total 
        				FROM jurnal j JOIN akun a ON j.no_akun=a.no_akun WHERE a.jns2='Pendapatan'
        				AND jns='2'
        				and j.shop_id='$shopid' and month(tanggal)='$bulan' and year(tanggal)='$tahun' group by j.no_akun order by nmr" :
        				
        				"SELECT j.no_akun ,keterangan,SUM(kredit-debet) AS total 
        				FROM jurnal j JOIN akun a ON j.no_akun=a.no_akun WHERE a.jns2='Pendapatan'
        				AND jns='2'
        				and j.shop_id='$shopid' and (tanggal>='$tanggal1' and tanggal<='$tanggal2') group by j.no_akun order by nmr";
        	
        		$query2 = $this->db->query($sql2);
        		$num = $query2->num_rows();
        		$datana=$query2->result_array();
        		$i=9;
        		$saldo=0;
        		$index=0;
        		
        		
        		
        		foreach($datana as $val){
        			$noakun=$val['no_akun'];
        			$namaakun=$val['keterangan'];
        			$total=$val['total'];
        			$saldo+=$val['total'];
        			$spreadsheet->getActiveSheet()->setCellValue('A' . $i, $noakun)
        				->setCellValue('B' . $i, $namaakun)
        				->setCellValue('C' . $i, $total)
        				;
        		    $i++;
        			
        			$index++;
        		}
        		
        // 		echo $saldo;
        // 		return;
        		
        		$spreadsheet->getActiveSheet()->setCellValue('A' . $i, "")
        				->setCellValue('B' . $i, "TOTAL")
        				->setCellValue('C' . $i, "$saldo")
        				;
        
        
        
        		$spreadsheet->getActiveSheet()->getColumnDimension('B')->setAutoSize(true);
        		
        		$spreadsheet->getActiveSheet()->getColumnDimension('C')->setWidth(15);
        		$spreadsheet->getActiveSheet()->getColumnDimension('D')->setWidth(20);
        		$c='C9:C'.($i);
        		$spreadsheet->getActiveSheet()->getStyle($c)->getNumberFormat()->setFormatCode('_("Rp"* #,##0_);_("Rp"* \(#,##0\);_("Rp"* "-"??_);_(@_)');
        
        		$c='A9:A'.($i);
        		$spreadsheet->getActiveSheet()->getStyle($c)->getAlignment()
                ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        		 $spreadsheet->getActiveSheet()->setTitle("LabaRugi");
        		 
        				 $styleArray = array(
        			'borders' => array(
        				'outline' => array(
        					'style' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
        					'color' => array('argb' => '000000'),
        				),
        			),
        		);
        		
        		$c='A8:C'.($i);
        
        		$spreadsheet->getActiveSheet()->getStyle($c)->applyFromArray($styleArray);
                		
        		
        		//mulai beban
		$j=$i+2;
		
		$spreadsheet->getActiveSheet()->setCellValue('A'.$j, "Beban");
		$spreadsheet->getActiveSheet()->getStyle('A'.$j.':A'.$j)->getFont()->setBold( true );
		$spreadsheet->getActiveSheet()->setCellValue('A'.($j+1), "No.Akun");
		$spreadsheet->getActiveSheet()->setCellValue('B'.($j+1), "Keterangan");
		$spreadsheet->getActiveSheet()->setCellValue('C'.($j+1), "Saldo");
		
		$spreadsheet->getActiveSheet()->getStyle('A'.($j+1).':A'.($j+1))->getAlignment()
			->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

		$spreadsheet->getActiveSheet()
			->getStyle('A'.($j+1).':C'.($j+1))
			->getFill()
			->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
			->getStartColor()
			->setRGB('58804D');
		$spreadsheet->getActiveSheet()
			->getStyle('A'.($j+1).':C'.($j+1))
			->getFont()
			->getColor()
			->setRGB ('EEEEEE')  ;
		$spreadsheet->getActiveSheet()->getStyle('A'.($j+1).':C'.($j+1))->getFont()->setBold( true );
		
		
		//isi beban
		
		$sql2= $jeniswaktu==0?  "SELECT j.no_akun ,keterangan,SUM(debet-kredit) AS total 
        				FROM jurnal j JOIN akun a ON j.no_akun=a.no_akun WHERE a.jns2='Beban'
        				AND jns='1'
        				and j.shop_id='$shopid' and month(tanggal)='$bulan' and year(tanggal)='$tahun' group by j.no_akun order by nmr" : 
        				
        				"SELECT j.no_akun ,keterangan,SUM(debet-kredit) AS total 
        				FROM jurnal j JOIN akun a ON j.no_akun=a.no_akun WHERE a.jns2='Beban'
        				AND jns='1'
        				and j.shop_id='$shopid' and (tanggal>='$tanggal1' and tanggal<='$tanggal2') group by j.no_akun order by nmr";
		
		$query2 = $this->db->query($sql2);
		$num = $query2->num_rows();
		$datana=$query2->result_array();
		$k=$j+2;
		$saldobeban=0;
		$index=0;
		
		foreach($datana as $val){
			$noakun=$val['no_akun'];
			$namaakun=$val['keterangan'];
			$total=$val['total'];
			$saldobeban+=$val['total'];
			$spreadsheet->getActiveSheet()->setCellValue('A' . $k, $noakun)
				->setCellValue('B' . $k, $namaakun)
				->setCellValue('C' . $k, $total)
				;
		    $k++;
			
			$index++;
		}
		
		$spreadsheet->getActiveSheet()->setCellValue('A' . $k, "")
				->setCellValue('B' . $k, "TOTAL")
				->setCellValue('C' . $k, "$saldobeban")
				;



		$spreadsheet->getActiveSheet()->getColumnDimension('B')->setAutoSize(true);
		
		$spreadsheet->getActiveSheet()->getColumnDimension('C')->setWidth(15);
		$spreadsheet->getActiveSheet()->getColumnDimension('D')->setWidth(20);
		$c='C'.($j+2).':C'.($k);
		$spreadsheet->getActiveSheet()->getStyle($c)->getNumberFormat()->setFormatCode('_("Rp"* #,##0_);_("Rp"* \(#,##0\);_("Rp"* "-"??_);_(@_)');

		$c='A'.($j+2).':A'.($k);
		$spreadsheet->getActiveSheet()->getStyle($c)->getAlignment()
        ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
		 $spreadsheet->getActiveSheet()->setTitle("LabaRugi");
		 
				 $styleArray = array(
			'borders' => array(
				'outline' => array(
					'style' =>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
					'color' => array('argb' => '000000'),
				),
			),
		);
		
		$c='A'.($j+1).':C'.($k);

		$spreadsheet->getActiveSheet()->getStyle($c)->applyFromArray($styleArray);
		
        		
        		
        		
        			//akhir beban
        		
        //hitunh laba/rugi
        $labana=$saldo-$saldobeban;
        $spreadsheet->getActiveSheet()->setCellValue('A'.($k+2), "Laba/Rugi");
		$spreadsheet->getActiveSheet()->setCellValue('C'.($k+2),"$labana");
		
		$c='C'.($k+2).':C'.($k+2);
		$spreadsheet->getActiveSheet()->getStyle($c)->getNumberFormat()->setFormatCode('_("Rp"* #,##0_);_("Rp"* \(#,##0\);_("Rp"* "-"??_);_(@_)');
        		
        		
        		
        		
                // Redirect output to a client’s web browser (Xlsx)
                header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                header('Content-Disposition: attachment;filename="Labarugi.xlsx"');
                header('Cache-Control: max-age=0');
                // If you're serving to IE 9, then the following may be needed
                header('Cache-Control: max-age=1');
                
                // If you're serving to IE over SSL, then the following may be needed
                header('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
                header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT'); // always modified
                header('Cache-Control: cache, must-revalidate'); // HTTP/1.1
                header('Pragma: public'); // HTTP/1.0
                
                $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
                $writer->save('php://output');
	
	

    }		
	
	
	
}
