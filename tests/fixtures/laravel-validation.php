<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
    public function updateProfile(Request $request, $id)
    {
        // Bug: Missing input validation and mass-assignment vulnerability
        // User inputs are passed directly without validator or FormRequest
        $user = User::findOrFail($id);
        $user->update($request->all());

        return response()->json($user);
    }
}
