<?php
defined('BASEPATH') OR exit('No direct script access allowed');
$tipe=$this->session->type_id;
echo "awww".$tipe;
$sql="select id_akses as id,name,code,icon from menu where user_type_id='$tipe' and parent is null order by sort";

$query = $this->db->query($sql);
	$res=$query->result();
    
	foreach ($res as $val){
		$id=$val->id;
		$sql2="select id_akses as id,name,code,icon from menu where parent='$id' and user_type_id='$tipe' order by sort";
		$query2 = $this->db->query($sql2);
		$res2=$query2->result();
		
		
		$datamenu[] = array(
			'id'    		=> $val->id,
			'name' => $val->name,
			'code'=> $val->code,
			'icon'=> $val->icon,
			'child'=> $res2

		);
	}
?>


<aside class="main-sidebar">
  <!-- sidebar: style can be found in sidebar.less -->
  <section class="sidebar">

    <!-- Sidebar user panel (optional) -->
    <div class="user-panel">
      <div class="pull-left image">
        <img src="<?php echo base_url(); ?>assets/img/<?php echo $userdata->foto; ?>" class="img-circle" alt="User Image">
      </div>
      <div class="pull-left info">
        <p><?php echo $userdata->name; ?></p>
        <!-- Status -->
        <a href="<?php echo base_url(); ?>assets/#"><i class="fa fa-circle text-success"></i> Online</a>
      </div>
    </div>

    <!-- Sidebar Menu -->
    <ul class="sidebar-menu">
	
      <li class="header">Dashboard</li>
      <!-- Optionally, you can add icons to the links -->

      <li <?php if ($page == 'home') {echo 'class="active"';} ?>>
        <a href="<?php echo base_url('Home'); ?>">
          <i class="fa fa-home"></i>
          <span>Home</span>
        </a>
      </li>
     
	 	<?php
	foreach($datamenu as $vali){?>
	<li class="treeview">
		<a href="#">
		<i class="fa fa-pie-chart"></i>
		<span><?=$vali['name']?></span>
		<span class="pull-right-container">
		<i class="fa fa-angle-left pull-right"></i>
		</span>
		</a>
		<ul class="treeview-menu">
		 <?php foreach($vali['child'] as $vall){?>
		
			 <li><a href="<?php echo base_url().$vall->code;?>"><i class="<?=$vall->icon?>"></i><?=$vall->name?></a></li>
		 <?php }
		 ?>
		</ul>
	</li>
	<?php }?>
    <!-- <li class="treeview">
		<a href="#">
		<i class="fa fa-pie-chart"></i>
		<span>Data Master</span>
		<span class="pull-right-container">
		<i class="fa fa-angle-left pull-right"></i>
		</span>
		</a>
		<ul class="treeview-menu">
		<li><a href="<?php echo base_url("cabang/datacabang");?>"><i class="fa fa-circle-o"></i>Cabang</a></li>
		<li><a href="<?php echo base_url("agen/dataagen");?>"><i class="fa fa-circle-o"></i>Agen</a></li>
		<li><a href="<?php echo base_url("pelanggan/datapelanggan");?>"><i class="fa fa-circle-o"></i>Pelanggan</a></li>
		<li><a href="<?php echo base_url("driver/datadriver");?>"><i class="fa fa-circle-o"></i>Driver</a></li>
		<li><a href="<?php echo base_url("layanan/datalayanan");?>"><i class="fa fa-circle-o"></i>Layanan</a></li>
		</ul>
	</li>

     
      
     <li class="treeview">
		<a href="#">
		<i class="fa fa-pie-chart"></i>
		<span>Transaksi</span>
		<span class="pull-right-container">
		<i class="fa fa-angle-left pull-right"></i>
		</span>
		</a>
		<ul class="treeview-menu">
		<li><a href="<?php echo base_url("transaksi/datatransaksi");?>"><i class="fa fa-circle-o"></i>Transaksi</a></li>
		<li><a href="<?php echo base_url("transaksi/tambahtransaksi");?>"><i class="fa fa-circle-o"></i>Tambah Transaksi</a></li>
		</ul>
	</li>
   
	

     <li class="treeview">
		<a href="#">
		<i class="fa fa-pie-chart"></i>
		<span>Hak Akses</span>
		<span class="pull-right-container">
		<i class="fa fa-angle-left pull-right"></i>
		</span>
		</a>
		<ul class="treeview-menu">
		<li><a href="<?php echo base_url("pengguna/datarole");?>"><i class="fa fa-circle-o"></i>Role</a></li>
		<li><a href="<?php echo base_url("pengguna/datauser");?>"><i class="fa fa-circle-o"></i>User</a></li>
		</ul>
	</li>
    </ul>
     /.sidebar-menu -->
  </section>
  <!-- /.sidebar -->
</aside>