// This file contains the Supabase schema for the IMU testing platform
// Run this script once to set up your Supabase tables

import { supabase } from "@/lib/supabase"

export async function setupSupabaseTables() {
    try {
        // Create users table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "users",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        admin_id UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create customers table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "customers",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        height FLOAT NOT NULL,
        weight FLOAT NOT NULL,
        sleep_levels FLOAT NOT NULL,
        activity_level TEXT NOT NULL,
        calorie_intake INTEGER NOT NULL,
        mood TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create tests table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "tests",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT NOT NULL,
        customer_id UUID REFERENCES customers(id),
        tester_id UUID REFERENCES users(id),
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create exercises table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "exercises",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        test_id UUID REFERENCES tests(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create imu_tests table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "imu_tests",
            columns: `
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        tester_id UUID NOT NULL,
        current_exercise_type TEXT,
        current_exercise_name TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create imu_data table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "imu_data",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_id UUID NOT NULL,
        exercise_type TEXT,
        exercise_name TEXT,
        acc_x FLOAT NOT NULL,
        acc_y FLOAT NOT NULL,
        acc_z FLOAT NOT NULL,
        gyr_x FLOAT NOT NULL,
        gyr_y FLOAT NOT NULL,
        gyr_z FLOAT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create device_discoveries table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "device_discoveries",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create device_connections table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "device_connections",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        connected_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create test_downloads table
        await supabase.rpc("create_table_if_not_exists", {
            table_name: "test_downloads",
            columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_id UUID NOT NULL,
        download_url TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
        })

        // Create storage buckets
        await supabase.storage.createBucket("test-data", {
            public: false,
            allowedMimeTypes: ["text/csv", "application/json"],
            fileSizeLimit: 52428800, // 50MB
        })

        console.log("Supabase tables and storage set up successfully")
        return true
    } catch (error) {
        console.error("Error setting up Supabase tables:", error)
        return false
    }
}

// Function to initialize Supabase storage
export async function setupSupabaseStorage() {
    try {
        // Check if the bucket already exists
        const { data: buckets } = await supabase.storage.listBuckets()
        const testDataBucketExists = buckets?.some((bucket) => bucket.name === "test-data")

        if (!testDataBucketExists) {
            // Create the test-data bucket
            await supabase.storage.createBucket("test-data", {
                public: false,
                allowedMimeTypes: ["text/csv", "application/json"],
                fileSizeLimit: 52428800, // 50MB
            })
        }

        console.log("Supabase storage set up successfully")
        return true
    } catch (error) {
        console.error("Error setting up Supabase storage:", error)
        return false
    }
}
