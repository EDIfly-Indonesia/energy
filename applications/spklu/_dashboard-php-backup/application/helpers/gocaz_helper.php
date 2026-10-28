<?php

    function segment_url($code = ''){
        $ci = & get_instance();
        return base_url($ci->uri->segment(1)."/$code");
    }
    function get_access(){
        $ci = & get_instance();
        $access = $ci->curl->simple_get(base_url('api/source/access/'.$ci->session->type_id));
        return json_decode($access);
    }
    function user_access($userTypeId,$accessId){
        $ci = & get_instance();
        $sql = "select * from user_access where user_type_id=$userTypeId and access_id=$accessId";
        return $ci->db->query($sql)->row_object();
    }
    function check_access($accessId = null,$userTypeId = null){
        $ci = & get_instance();
        if($ci->session->logged_in==''){
            redirect(base_url('auth/logout'));
        }
        if(!$accessId) return;
        $where = "access_id=$accessId";
        if($userTypeId) $where.=" and user_type_id=$userTypeId";
        $sql = "select b.*,a.c,a.u,a.d,a.a,c.name parent_name,c.icon parent_icon from t_user_access a left join t_access b on a.access_id=b.id left join t_access c on b.parent=c.id where $where";
        $access = $ci->db->query($sql)->row_object();
        if(!$access){
            $ci->session->set_flashdata('danger','Anda tidak memiliki akses ke halaman tersebut!');
            redirect(base_url('dashboard'));
        }else{
            $ci->data['access'] = $access;
        }
    }
    function forbidden(){
        return "Anda tidak memiliki akses!";
    }
	
	function namaaplikasi(){
	
        return "GoCaz";
    }
	function getidrole(){
		$ci = & get_instance();
        return $ci->session->id_role;
    }
    
    	function getidtipe(){
		$ci = & get_instance();
        return $ci->session->type_id;
    }
    
   
    
    function getqueryowner(){
		$ci = & get_instance();
	    $tipe=$ci->session->type_id;
		$idrole=$ci->session->id_role;
	$sql="";
	
		switch($tipe){
			case 1:
			 
			case 2:
			case 6:
			$sql="";
			break;
			case 3:
			case 4:
		    case 5:
			$sql=" and o.id_mitra='$idrole'";
			break;
		}
		return $sql;
	}
	
	
	
	function getqueryfilter(){
		$ci = & get_instance();
		$tipe=$ci->session->type_id;
		$idrole=$ci->session->id_role;
		$sql="";
		switch($tipe){
			case 1:
			$sql="";
			break;
			case 2:
			$sql=" and a.id_cabang='$idrole'";
			break;
			case 3:
			$sql=" and a.id='$idrole'";
			break;
		}
		 return $sql;
	}
	
	 function getnoref(){
	    $ci = & get_instance();
		 $tipe=$ci->session->type_id;
		if($tipe=="6") {
		$ci = & get_instance();
        $idmarketing= $ci->session->id_role;
        $sql = "SELECT no_ref FROM marketing where id_marketing=$idmarketing";
        $data = $ci->db->query($sql);
		}
		else {
			 $idrole= $ci->session->id_role;
		$sql="select no_ref from owner where owner_id=$idrole";
		$data = $ci->db->query($sql);
		$idmarketing=$data->row()->no_ref;;
        $sql = "SELECT no_ref FROM marketing where id_marketing=$idmarketing";
        $data = $ci->db->query($sql);
		}
       
		
       
        return $data->row()->no_ref;
            
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
	
	function getqueryfilterlaporan(){
		$ci = & get_instance();
		$tipe=$ci->session->type_id;
		$idrole=$ci->session->id_role;
		$sql="";
		switch($tipe){
			case 1:
			$sql="";
			break;
			case 2:
			$sql=" and a.id_cabang='$idrole'";
			break;
			case 3:
			$sql=" and a.id='$idrole'";
			break;
		}
		 return $sql;
	}
	
	function getTglIndo($tgl){
	   return date("d-M-Y", strtotime($tgl));  
	}
	
	function getqueryvia(){
		$ci = & get_instance();
		$tipe=$ci->session->type_id;
		
		$sql="";
		switch($tipe){
			case 1:
			
			case 2:
			$sql="";
			break;
			case 3:
			$sql=" and t.via='agen'";
			break;
		}
		 return $sql;
	}
    function created(){
        return "Data berhasil ditambahkan";
    }
    function updated(){
        return "Data berhasil diubah";
    }
    function nofound(){
        return "Data tidak ditemukan";
    }
    function undeletable(){
        return "Data tidak dapat dihapus";
    }
    function uneditable(){
        return "Data tidak dapat diubah";
    }
    function deleted(){
        return "Data berhasil dihapus";
    }
    function approved(){
        return "Data berhasil disetujui";
    }
    function verified(){
        return "Data berhasil diverifikasi";
    }
    function get_notif(){
        $ci = & get_instance();
        $data = array();
        if($ci->session->type_id==1){
            $ci->db->where("approve is null");
            $ci->db->order_by('id','desc');
            $data = $ci->db->get('project')->result();
        }
        if($ci->session->type_id==4){
            $sql = "select a.* 
                    from project a
                    left join project_user b on a.id=b.project_id 
                    left join project_job c on a.id=c.project_id 
                    where b.user_id=".$ci->session->id." and type_id=3 
                    and c.id is null and a.approve=1 order by a.id desc";
            $data = $ci->db->query($sql)->result();
        }
        return $data;
    }
    function get_request(){
        $ci = & get_instance();
        $data = array();
        $sql = "select a.*,b.project_id,b.qty rap_qty,sum(e.qty) quote_total, 
                f.code project_code,g.account_id,h.expense from request a
                left join project_job b on a.job_id=b.id
                left join transaction_detail e on a.id=e.request_id
                left join project f on b.project_id=f.id
                left join project_job g on b.parent=g.id
                left join account h on g.account_id=h.id group by a.id";
        if($ci->session->type_id==3){
            $ci->db->query("create temporary table request_temp($sql)");
            $sql = "select project_id,project_code,count(id) total_request,create_time from request_temp 
                    where approve=1 and (quote_total is null or quote_total<qty) and expense=0 and cash=0
                    group by project_id";
            $data = $ci->db->query($sql)->result();
            $ci->db->query("drop table request_temp");
        }
        if($ci->session->type_id==4 or $ci->session->type_id==1){
            $ci->db->query("create temporary table transaction_temp (select a.*,c.code project_code from transaction a left join transaction_detail b on a.id=b.transaction_id left join project c on a.project_id=c.id where b.id is not null group by a.id)");
            $sql = "select a.* from transaction_temp a";
            if($ci->session->type_id==4){ 
                $sql.=" left join (select * from project_user where type_id=1) b on a.project_id=b.project_id left join transaction_detail c on a.id=c.transaction_id";
                $sql.=" where a.type_id=1 and a.approve is null and b.user_id=".$ci->session->id;
            }else $sql.=" where type_id=1 and (approve is null or approve=1)";
            $data = $ci->db->query($sql)->result();
            // $data = $sql;
        }
        return $data;
    }
    function get_project_request(){
        $ci = & get_instance();
        $data = array();
        $ci->db->query("create temporary table project_user_temp(select * from project_user where type_id=3)");
        $user_id = $ci->session->id;
        $sql = "select b.project_id,c.code project_code,count(a.id) request_total,a.create_time
                from request a 
                left join project_job b on a.job_id=b.id
                left join project c on b.project_id=c.id
                left join project_user_temp d on c.id=d.project_id
                where d.user_id=$user_id and a.approve is null
                group by c.id";
        $data = $ci->db->query($sql)->result();
        // $data = $sql;
        $ci->db->query('drop table project_user_temp');
        return $data;
    }
    function get_po(){
        $ci = & get_instance();
        $data = array();
        $sql = "select a.*,b.code project_code,c.name person_name
                from transaction a
                left join project b on a.project_id=b.id
                left join person c on a.person_id=c.id
                left join quote_order d on a.id=d.quote_id
                where a.type_id=1 and d.id is null and a.approve>0";
        if($ci->session->type_id==3){
            $ci->db->query("create temporary table quote_temp($sql)");
            $data = $ci->db->get('quote_temp')->result();
            $ci->db->query("drop table quote_temp");
        }
        return $data;
    }

    function get_spk(){
        $ci = & get_instance();
        $link = base_url('api/spk?approve=null');
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
    function get_company(){ 
        $ci = & get_instance();
        return $ci->db->get('company')->result();
    }
    function get_user($typeId = null){
        $ci = & get_instance();
        if($typeId) $ci->db->where('type_id',$typeId);
        $ci->db->select("id,name");
        return $ci->db->get('users')->result();
    }
    function print_transaction($id,$category){
        $ci = & get_instance();
        $ci->db->where('transaction_id',$id);
        $ci->db->where('category_id',$category);
        $print = $ci->db->get('print_transaction')->row_object();
        if(!$print){
            $ci->db->insert(
                'print_transaction',
                array(
                    'transaction_id' => $id,
                    'category_id' => $category
                )
            );
        }
    }
    function get_delivery(){
        $ci = & get_instance();
        $link = base_url('api/order?field=1&').'logistic='.$ci->session->id;
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
    function get_bon(){
        $ci = & get_instance();
        $link = base_url("api/invoice/new?create=true");
        // $link = base_url('api/delivery?invoice=false');
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
    function get_payment(){
        $ci = & get_instance();
        $link = base_url('api/invoice?payment=true&approve=1');
        if($ci->session->type_id==1)
            $link = base_url('api/payment?approve=-1');
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
    function get_req_expense(){
        $ci = & get_instance();
        $link = base_url('api/request?expense=1&action=new');
        if($ci->session->type_id==2 or $ci->session->type_id==5) $link.="&approve=2,3";
        else $link.="&approve=1";
        if($ci->session->type_id==4) {
            $link.="&estimator=".$ci->session->id;
        }
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
    function get_petty_cash(){
        $ci = & get_instance();
        $link = base_url("api/invoice/cash");
        if($ci->session->type_id==5) $link.="?approve=1";
        if($ci->session->type_id==2) $link.="?approve=2";
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        $result = array();
        if($ci->session->type_id==2) {
            foreach($data->data as $d){
                $total = $d->sub_total+$d->tax_total;
                if($d->include_tax) $total/=($d->sub_total+$d->tax_total)/$d->sub_total;
                if($total>floatval($d->payment_amount)) $result[] = $d;
            }
        }else{
            $result = $data->data;
        }
        return $result;
    }
    function problem_bon(){
        $ci = & get_instance();
        $link = base_url('api/invoice?approve=0&checked=1');
        $data =  $ci->curl->simple_get($link);
        $data = json_decode($data);
        return $data->data;
    }
	function api_key(){
        // return "1aa6c84022a5213c82a3b040475d62a1";
        return "88a7acd0514a4931c052183d8e52fb26";
	}
    function api_url($param){
        // return "http://sandbox-api.jurnal.id/core/api/v1/$param";
        return "https://api.jurnal.id/core/api/v1/$param";
    }
    function api_post($table,$data){
        $curl = curl_init();

        curl_setopt_array($curl, array(
        CURLOPT_URL => api_url($table),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => $data,
        CURLOPT_HTTPHEADER => array(
            "apikey: ".api_key(),
            "content-type: application/json"
        ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
        return "cURL Error #:" . $err;
        } else {
        return $response;
        }
    }
    function api_get($table){
        $curl = curl_init();
        curl_setopt_array($curl, array(
        CURLOPT_URL => api_url($table),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
        CURLOPT_POSTFIELDS => "{}",
        CURLOPT_HTTPHEADER => array(
            "apikey: ".api_key()
        ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
        return "cURL Error #:" . $err;
        } else {
        return $response;
        }
    }
    function api_delete($table,$id){
        $curl = curl_init();
        curl_setopt_array($curl, array(
        CURLOPT_URL => api_url($table."/".$id),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "DELETE",
        CURLOPT_POSTFIELDS => "{}",
        CURLOPT_HTTPHEADER => array(
            "apikey: ".api_key()
        ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
        return "cURL Error #:" . $err;
        } else {
        return $response;
        }
    }
    function format_tanggal($date,$day = false){
        $months = array('','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember');
        $days = array('Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu');
        $dates = explode('-',$date);
        $yy = $dates[0];
        $mm = $months[intval($dates[1])];
        $dd = $dates[2];
        $date = "$dd $mm $yy";
        return $date;
    }
    function jurnal_url($sgm = ''){
        return "http://sandbox.jurnal.id/$sgm";
    }
