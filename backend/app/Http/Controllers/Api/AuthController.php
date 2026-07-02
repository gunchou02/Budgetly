<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\DefaultCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, DefaultCategoryService $defaultCategoryService): JsonResponse
    {
        $user = DB::transaction(function () use ($request, $defaultCategoryService): User {
            $user = User::create($request->validated());

            $defaultCategoryService->createForUser($user);

            return $user;
        });

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $user->createToken('api')->plainTextToken,
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['メールアドレスまたはパスワードが正しくありません。'],
            ]);
        }

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $user->createToken('api')->plainTextToken,
            ],
        ]);
    }

    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json([
            'data' => request()->user(),
        ]);
    }
}
