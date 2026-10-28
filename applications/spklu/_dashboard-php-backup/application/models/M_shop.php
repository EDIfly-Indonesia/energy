<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class M_shop extends CI_Model {
	public function select_all_pegawai() {
		$sql = "SELECT * FROM pegawai";

		$data = $this->db->query($sql);

		return $data->result();
	}

	public function select_all() {
		$sql = " SELECT * FROM pendaftaran order by id_daftar";

		$data = $this->db->query($sql);

		return $data->result();
	}

	public function select_by_id($id) {
		$sql = "SELECT pegawai.id AS id_pegawai, pegawai.nama AS nama_pegawai, pegawai.id_kota, pegawai.id_kelamin, pegawai.id_posisi, pegawai.telp AS telp, kota.nama AS kota, kelamin.nama AS kelamin, posisi.nama AS posisi FROM pegawai, kota, kelamin, posisi WHERE pegawai.id_kota = kota.id AND pegawai.id_kelamin = kelamin.id AND pegawai.id_posisi = posisi.id AND pegawai.id = '{$id}'";

		$data = $this->db->query($sql);

		return $data->row();
	}

	public function select_by_posisi($id) {
		$sql = "SELECT COUNT(*) AS jml FROM pendaftaran WHERE pilihan1 = {$id}";

		$data = $this->db->query($sql);

		return $data->row();
	}

	public function getdaftarmitra() {
		    $tipe=$this->session->type;
		    $noref=getnoref();
		    
		$sql = $tipe=="1" ? "SELECT owner_id as id,owner_name as nama from owner order by owner_name" : "SELECT owner_id as id,owner_name as nama from owner where no_ref='$noref' order by owner_name" ;
		$data = $this->db->query($sql);
		return $data->result();
	    }

	public function delete($id) {
		$sql = "DELETE FROM pelanggan WHERE id='" .$id ."'";

		$this->db->query($sql);

		return $this->db->affected_rows();
	}

	public function insert($data) {
		$id = md5(DATE('ymdhms').rand());
		$sql = "INSERT INTO pegawai VALUES('{$id}','" .$data['nama'] ."','" .$data['telp'] ."'," .$data['kota'] ."," .$data['jk'] ."," .$data['posisi'] .",1)";

		$this->db->query($sql);

		return $this->db->affected_rows();
	}

	public function insert_batch($data) {
		$this->db->insert_batch('pegawai', $data);
		
		return $this->db->affected_rows();
	}

	public function check_nama($nama) {
		$this->db->where('nama', $nama);
		$data = $this->db->get('pegawai');

		return $data->num_rows();
	}

	public function total_rows() {
	   
		$sql = "SELECT COUNT(*) AS jml FROM shop";

		$data = $this->db->query($sql);

		return $data->row()->jml;
		
		}
}

/* End of file M_pegawai.php */
/* Location: ./application/models/M_pegawai.php */