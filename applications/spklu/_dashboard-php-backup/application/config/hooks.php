<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$hook['pre_system'] = function() {
    if (file_exists(FCPATH . 'vendor/autoload.php')) {
        require_once FCPATH . 'vendor/autoload.php';
    }

    $dotenv = Dotenv\Dotenv::createImmutable(FCPATH);
  try {
    $dotenv->load();
  } catch ( Exception $e )  {
    echo $e->getMessage();
  }
};
/*
| -------------------------------------------------------------------------
| Hooks
| -------------------------------------------------------------------------
| This file lets you define "hooks" to extend CI without hacking the core
| files.  Please see the user guide for info:
|
|	https://codeigniter.com/user_guide/general/hooks.html
|
*/
