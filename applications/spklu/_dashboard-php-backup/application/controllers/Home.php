<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Home extends AUTH_Controller {
	public function __construct() {
		parent::__construct();
		$this->load->model('M_pelanggan');
		$this->load->model('M_marketing');
		
		
		$this->load->model('M_mitra');
	
	}

	public function index() {
	     $hakakses=$this->session->type_id;
		 $jumlahhari=(int) date("t");
		 $vgrafiktotaltransaksibulanan=array();
		 $vgrafikjumlahtransaksibulanan=array();
			if($hakakses==1){ 
			$data['jml_tenant'] 	= $this->M_mitra->total_tenant();
        		$data['jml_user'] 	= $this->M_mitra->total_user();
			}
			
			    $data['jml_charge'] 	= $this->M_mitra->total_charge();
        		
        		
				
				$grafiktotaltransaksibulanan=$this->M_mitra->grafiktotaltransaksibulanan();
				$grafikjumlahtransaksibulanan=$this->M_mitra->grafikjumlahtransaksibulanan();
				$labelgrafikbulanan = array();
				for($i=11;$i>=0;$i--){
					$monthKey = date('Y-m', strtotime("-".$i." month"));
					$labelgrafikbulanan[] = date('M Y', strtotime($monthKey.'-01'));
					$index = 11 - $i;
					$vgrafiktotaltransaksibulanan[$index]=0;
					foreach($grafiktotaltransaksibulanan as $rowjum){
						if(isset($rowjum->month_key) && $monthKey==$rowjum->month_key) $vgrafiktotaltransaksibulanan[$index]= intval($rowjum->total);
					}
					
					$vgrafikjumlahtransaksibulanan[$index]=0;
					foreach($grafikjumlahtransaksibulanan as $rowjum){
						if(isset($rowjum->month_key) && $monthKey==$rowjum->month_key) $vgrafikjumlahtransaksibulanan[$index]= intval($rowjum->total);
					}
					
				}
				
				 $transaksiharian=array();
				  $jumtransaksiharian= $this->M_mitra->grafiktransaksiharian();;
				 for($i=0;$i<$jumlahhari;$i++){
			    	    $transaksiharian[$i]=0;
            		     foreach($jumtransaksiharian as $rowtrans){
            		        if($i==($rowtrans->tanggal-1)) $transaksiharian[$i]=$rowtrans->total;
            		    }
			    	}
			    	
			    $data['grafiktransaksiharian']=$transaksiharian;
			    $data['jumlahhari']=$jumlahhari;
				$data['labelgrafikbulanan']= $labelgrafikbulanan;
				$data['grafiktotaltransaksibulanan']= $vgrafiktotaltransaksibulanan;
				$data['grafikjumlahtransaksibulanan']= $vgrafikjumlahtransaksibulanan;
				$data['jumcharging'] 	= $this->M_mitra->jumcharging();
				
				$data['dataharian'] 	= $this->M_mitra->dataharian();
				$data['databulanan'] 	= $this->M_mitra->databulanan();
        		
			
			
				$data['userdata'] 		= $this->userdata;

				$data['page'] 			= "home";
				$data['judul'] 			= "Beranda";
				$data['deskripsi'] 		= "SPOS";
				if($hakakses==3 )
				$this->template->views('home_mitra', $data);
			    elseif ($hakakses==4 || $hakakses==5){
					$transaksiharianmanual=array();
					 $vgrafiktotaltransaksibulananmanual=array();
								  $jumtransaksiharianmanual= $this->M_mitra->grafiktransaksiharianmanual();;
								 for($i=0;$i<$jumlahhari;$i++){
										$transaksiharianmanual[$i]=0;
										 foreach($jumtransaksiharianmanual as $rowtrans){
											if($i==($rowtrans->tanggal-1)) $transaksiharianmanual[$i]=$rowtrans->total;
										}
									}
									 $data['grafiktransaksiharianmanual']=$transaksiharianmanual;
									$data['jumchargingmanual'] 	= $this->M_mitra->jumchargingmanual();
									$data['dataharianmanual'] 	= $this->M_mitra->dataharianmanual();
									$data['databulananmanual'] 	= $this->M_mitra->databulananmanual();
									
									
									$grafiktotaltransaksibulananmanual=$this->M_mitra->grafiktotaltransaksibulananmanual();
									 $vgrafikjumlahtransaksibulananmanual=array();
								$grafikjumlahtransaksibulananmanual=$this->M_mitra->grafikjumlahtransaksibulananmanual();
								 for($i=11;$i>=0;$i--){
									$monthKey = date('Y-m', strtotime("-".$i." month"));
									$index = 11 - $i;
									$vgrafiktotaltransaksibulananmanual[$index]=0;
									foreach($grafiktotaltransaksibulananmanual as $rowjum){
										if(isset($rowjum->month_key) && $monthKey==$rowjum->month_key) $vgrafiktotaltransaksibulananmanual[$index]= intval($rowjum->total);
									}
									
									$vgrafikjumlahtransaksibulananmanual[$index]=0;
									foreach($grafikjumlahtransaksibulananmanual as $rowjum){
										if(isset($rowjum->month_key) && $monthKey==$rowjum->month_key) $vgrafikjumlahtransaksibulananmanual[$index]= intval($rowjum->total);
									}
									
								}
									$data['grafikjumlahtransaksibulananmanual']= $vgrafikjumlahtransaksibulananmanual;
									$data['grafiktotaltransaksibulananmanual']= $vgrafiktotaltransaksibulananmanual;
									
									$this->template->views('home_keu', $data);
				}
			   
				else 	$this->template->views('home', $data);
	}
}

/* End of file Home.php */
/* Location: ./application/controllers/Home.php */