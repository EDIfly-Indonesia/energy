<?php
class Transaksi_model extends CI_Model {
	
	
	
	public function __construct() {
        parent::__construct();
		
    }
	
	
	public function getdaftaralamat($idpelanggan) {
		$sql = "SELECT * FROM daftaralamat where id_pelanggan=? order by isutama desc,id";
		$data = $this->db->query($sql,[$idpelanggan]);
		return $data->result();
	}
	
	public function getdaftaragen() {
		$sql = "SELECT id,nama_agen,alamat_agen,latitude,longitude FROM agen where latitude!='' and longitude!=''";
		$data = $this->db->query($sql);
		return $data->result();
	}
	
	public function getdaftaragenbaru($latitude,$longitude) {
		$distance=10;
		$sqlradius = "SELECT id FROM cabang where 
		 (ROUND(6371 * acos (cos ( radians($latitude) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians($longitude) ) + sin ( radians($latitude) ) * sin( radians( latitude ) )),2)) <= $distance
		 ";

		$sql = "SELECT id,nama_agen,alamat_agen,latitude,longitude FROM agen where latitude!='' and longitude!='' and id_cabang in($sqlradius)";
		$data = $this->db->query($sql);
		return $data->result();
	}
	
	public function getdaftarlayanan() {
		$sql = "select id,kode_layanan,nama_layanan,satuan,round(harga_jual,0) harga_jual,jenis_layanan
			from layanan where status=1";
		$data = $this->db->query($sql);
		return $data->result();
	}
	
	public function getdaftartransaksi($idpelanggan,$limit) {
		$sqlimit=$limit==0?"":" limit $limit";
		$sql = " select t.id,t.nomor_transaksi,DATE_FORMAT(t.tgl_transaksi, '%d %b %Y')  tgl_transaksi,
			t.jumlah,t.status_laundry as status_laundry_asli,cara_bayar,da.alamat,
			(case when t.status_laundry=0 then 'ready pick up' when t.status_laundry=1 then 'pick up' 
			when t.status_laundry=2 then 'proses' when t.status_laundry=3 then 'diantar' when t.status_laundry=4 then 'done' end) status_laundry,
			(case when t.status_bayar=0 then 'Belum dibayar' else 'Dibayar' end) status_bayar,coalesce(nama_agen,'') nama_agen
			from (select * from transaksi where id_pelanggan=?) t 
			join  daftaralamat da on t.id_alamat=da.id
			join agen a on t.id_agen=a.id order by t.id desc ". $sqlimit;
		$data = $this->db->query($sql,[$idpelanggan]);
		return $data->result();
	}
	
	
}